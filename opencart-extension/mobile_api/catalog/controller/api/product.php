<?php
namespace Opencart\Catalog\Controller\Extension\MobileApi\Api;
/**
 * Class Product
 *
 * GET  extension/mobile_api/api/product.index      list / search / category / brand / specials
 *        params: category_id, sub_category, manufacturer_id, search, tag, description,
 *                filter (comma separated filter ids), special=1, sort, order, page, limit
 * GET  extension/mobile_api/api/product.info&product_id=40
 * GET  extension/mobile_api/api/product.reviews&product_id=40&page=1
 * POST extension/mobile_api/api/product.review&product_id=40   {author, text, rating}
 *
 * @package Opencart\Catalog\Controller\Extension\MobileApi\Api
 */
class Product extends \Opencart\System\Library\Extension\MobileApi\ApiController {
	/**
	 * Paginated product list.
	 *
	 * @return void
	 */
	public function index(): void {
		if (!$this->guard()) {
			return;
		}

		$this->load->model('catalog/product');

		$page = max(1, (int)$this->query('page', 1));
		$limit = min(100, max(1, (int)$this->query('limit', 20)));

		$sort_map = [
			'default'    => ['p.sort_order', 'ASC'],
			'name_asc'   => ['pd.name', 'ASC'],
			'name_desc'  => ['pd.name', 'DESC'],
			'price_asc'  => ['p.price', 'ASC'],
			'price_desc' => ['p.price', 'DESC'],
			'rating'     => ['rating', 'DESC'],
			'newest'     => ['p.date_added', 'DESC'],
			'model'      => ['p.model', 'ASC']
		];

		$sort_key = (string)$this->query('sort', 'default');

		[$sort, $order] = $sort_map[$sort_key] ?? $sort_map['default'];

		$filter_data = [
			'filter_category_id'     => (int)$this->query('category_id', 0),
			'filter_sub_category'    => (bool)$this->query('sub_category', true),
			'filter_manufacturer_id' => (int)$this->query('manufacturer_id', 0),
			'filter_search'          => (string)$this->query('search', ''),
			'filter_tag'             => (string)$this->query('tag', ''),
			'filter_description'     => (bool)$this->query('description', false),
			'filter_filter'          => (string)$this->query('filter', ''),
			'sort'                   => $sort,
			'order'                  => $order,
			'start'                  => ($page - 1) * $limit,
			'limit'                  => $limit
		];

		$products = [];

		if ($this->query('special', '')) {
			$total = $this->model_catalog_product->getTotalSpecials();

			foreach ($this->model_catalog_product->getSpecials($filter_data) as $row) {
				$product_info = $this->model_catalog_product->getProduct((int)$row['product_id']);

				if ($product_info) {
					$products[] = $this->productCard($product_info);
				}
			}
		} else {
			$total = $this->model_catalog_product->getTotalProducts($filter_data);

			foreach ($this->model_catalog_product->getProducts($filter_data) as $row) {
				$products[] = $this->productCard($row);
			}
		}

		$this->ok([
			'products' => $products,
			'total'    => (int)$total,
			'page'     => $page,
			'limit'    => $limit,
			'pages'    => (int)ceil($total / $limit),
			'sorts'    => array_keys($sort_map)
		]);
	}

	/**
	 * Full product detail.
	 *
	 * @return void
	 */
	public function info(): void {
		if (!$this->guard()) {
			return;
		}

		$product_id = (int)$this->query('product_id', 0);

		$this->load->model('catalog/product');

		$product_info = $this->model_catalog_product->getProduct($product_id);

		if (!$product_info) {
			$this->fail('Product not found.', [], 404);

			return;
		}

		$show_price = $this->canSeePrice();
		$tax_class_id = (int)$product_info['tax_class_id'];

		// Manufacturer
		$this->load->model('catalog/manufacturer');

		$manufacturer_info = $this->model_catalog_manufacturer->getManufacturer((int)$product_info['manufacturer_id']);

		// Stock
		if ($product_info['quantity'] <= 0) {
			$stock_status_id = (int)$product_info['stock_status_id'];
		} elseif (!$this->config->get('config_stock_display')) {
			$stock_status_id = (int)$this->config->get('config_stock_status_id');
		} else {
			$stock_status_id = 0;
		}

		$this->load->model('localisation/stock_status');

		$stock_status_info = $this->model_localisation_stock_status->getStockStatus($stock_status_id);

		$stock = $stock_status_info ? $this->decode($stock_status_info['name']) : (string)$product_info['quantity'];

		// Images
		$popup_w = (int)$this->config->get('config_image_popup_width') ?: 800;
		$popup_h = (int)$this->config->get('config_image_popup_height') ?: 800;

		$images = [$this->image((string)$product_info['image'], $popup_w, $popup_h)];

		foreach ($this->model_catalog_product->getImages($product_id) as $result) {
			if ($result['image'] && is_file(DIR_IMAGE . html_entity_decode($result['image'], ENT_QUOTES, 'UTF-8'))) {
				$images[] = $this->image($result['image'], $popup_w, $popup_h);
			}
		}

		// Discounts (quantity breaks)
		$discounts = [];

		if ($show_price) {
			foreach ($this->model_catalog_product->getDiscounts($product_id) as $discount) {
				$discounts[] = [
					'quantity' => (int)$discount['quantity'],
					'price'    => $this->formatPrice((float)$discount['price'], $tax_class_id)
				];
			}
		}

		// Options (variants inherit options from their master product)
		$master_id = $product_info['master_id'] ? (int)$product_info['master_id'] : $product_id;

		$options = [];

		foreach ($this->model_catalog_product->getOptions($master_id) as $option) {
			if (isset($product_info['override']['variant'][$option['product_option_id']])) {
				continue;
			}

			$values = [];

			foreach ($option['product_option_value'] as $option_value) {
				if (!$option_value['subtract'] || ($option_value['quantity'] > 0)) {
					$price = '';

					if ($show_price && (float)$option_value['price']) {
						$price = $this->formatPrice((float)$option_value['price'], $tax_class_id);
					}

					$values[] = [
						'product_option_value_id' => (int)$option_value['product_option_value_id'],
						'option_value_id'         => (int)$option_value['option_value_id'],
						'name'                    => $this->decode($option_value['name']),
						'image'                   => $option_value['image'] ? $this->image($option_value['image'], 100, 100) : '',
						'price'                   => $price,
						'price_prefix'            => $option_value['price_prefix']
					];
				}
			}

			$options[] = [
				'product_option_id' => (int)$option['product_option_id'],
				'option_id'         => (int)$option['option_id'],
				'name'              => $this->decode($option['name']),
				'type'              => $option['type'],
				'value'             => $this->decode((string)$option['value']),
				'required'          => (bool)$option['required'],
				'validation'        => (string)($option['validation'] ?? ''),
				'values'            => $values
			];
		}

		// Subscriptions
		$subscriptions = [];

		foreach ($this->model_catalog_product->getSubscriptions($product_id) as $subscription) {
			$subscriptions[] = [
				'subscription_plan_id' => (int)$subscription['subscription_plan_id'],
				'name'                 => $this->decode($subscription['name'])
			];
		}

		// Attributes
		$attribute_groups = [];

		foreach ($this->model_catalog_product->getAttributes($product_id) as $group) {
			$attributes = [];

			foreach ($group['attribute'] as $attribute) {
				$attributes[] = [
					'name' => $this->decode($attribute['name']),
					'text' => $this->decode($attribute['text'])
				];
			}

			$attribute_groups[] = [
				'name'       => $this->decode($group['name']),
				'attributes' => $attributes
			];
		}

		// Related
		$related = [];

		foreach ($this->model_catalog_product->getRelated($product_id) as $row) {
			$related[] = $this->productCard($row);
		}

		// Wishlist flag
		$in_wishlist = false;

		if ($this->customer->isLogged()) {
			$this->load->model('account/wishlist');

			foreach ($this->model_account_wishlist->getWishlist($this->customer->getId()) as $item) {
				if ((int)$item['product_id'] === $product_id) {
					$in_wishlist = true;
					break;
				}
			}
		} elseif (!empty($this->session->data['wishlist'])) {
			$in_wishlist = in_array($product_id, (array)$this->session->data['wishlist']);
		}

		$card = $this->productCard($product_info);

		$this->ok([
			'product' => $card + [
				'description'      => $this->decode((string)$product_info['description']),
				'manufacturer'     => $manufacturer_info ? $this->decode($manufacturer_info['name']) : '',
				'manufacturer_id'  => (int)$product_info['manufacturer_id'],
				'stock'            => $stock,
				'quantity'         => (int)$product_info['quantity'],
				'reward'           => (int)($product_info['reward'] ?? 0),
				'points'           => (int)$product_info['points'],
				'tax'              => ($show_price && $this->config->get('config_tax')) ? $this->currency->format((float)($product_info['special'] ?: $product_info['price']), $this->session->data['currency']) : '',
				'images'           => $images,
				'discounts'        => $discounts,
				'options'          => $options,
				'subscriptions'    => $subscriptions,
				'attribute_groups' => $attribute_groups,
				'related'          => $related,
				'in_wishlist'      => $in_wishlist,
				'review_status'    => (bool)$this->config->get('config_review_status'),
				'can_review'       => (bool)$this->config->get('config_review_status') && ($this->customer->isLogged() || $this->config->get('config_review_guest')),
				'share_url'        => $this->decode($this->url->link('product/product', 'language=' . $this->config->get('config_language') . '&product_id=' . $product_id))
			]
		]);
	}

	/**
	 * Approved reviews for a product.
	 *
	 * @return void
	 */
	public function reviews(): void {
		if (!$this->guard()) {
			return;
		}

		$product_id = (int)$this->query('product_id', 0);
		$page = max(1, (int)$this->query('page', 1));
		$limit = 10;

		$this->load->model('catalog/review');

		$reviews = [];

		foreach ($this->model_catalog_review->getReviewsByProductId($product_id, ($page - 1) * $limit, $limit) as $review) {
			$reviews[] = [
				'review_id'  => (int)$review['review_id'],
				'author'     => $this->decode($review['author']),
				'rating'     => (int)$review['rating'],
				'text'       => $this->decode($review['text']),
				'date_added' => date($this->language->get('date_format_short'), strtotime($review['date_added']))
			];
		}

		$total = $this->model_catalog_review->getTotalReviewsByProductId($product_id);

		$this->ok([
			'reviews' => $reviews,
			'total'   => (int)$total,
			'page'    => $page,
			'pages'   => (int)ceil($total / $limit)
		]);
	}

	/**
	 * Write a review. Mirrors product/review.write validation (no captcha for native clients).
	 *
	 * @return void
	 */
	public function review(): void {
		if (!$this->guard()) {
			return;
		}

		$this->load->language('product/review');

		$product_id = (int)$this->query('product_id', $this->post('product_id', 0));

		$author = (string)$this->post('author', '');
		$text = (string)$this->post('text', '');
		$rating = (int)$this->post('rating', 0);

		$errors = [];

		if (!$this->config->get('config_review_status')) {
			$this->fail($this->t('error_status'), [], 403);

			return;
		}

		$this->load->model('catalog/product');

		if (!$this->model_catalog_product->getProduct($product_id)) {
			$this->fail($this->t('error_product'), [], 404);

			return;
		}

		if (!$this->customer->isLogged() && !$this->config->get('config_review_guest')) {
			$this->fail($this->t('error_login'), [], 401);

			return;
		}

		if ($this->customer->isLogged() && $this->config->get('config_review_purchased')) {
			$this->load->model('account/order');

			if (!$this->model_account_order->getTotalOrdersByProductId($product_id)) {
				$this->fail($this->t('error_purchased'), [], 403);

				return;
			}
		}

		if (!oc_validate_length($author, 3, 25)) {
			$errors['author'] = $this->t('error_author');
		}

		if (!oc_validate_length($text, 25, 1000)) {
			$errors['text'] = $this->t('error_text');
		}

		if ($rating < 1 || $rating > 5) {
			$errors['rating'] = $this->t('error_rating');
		}

		if ($errors) {
			$this->fail(reset($errors), $errors, 422);

			return;
		}

		$this->load->model('catalog/review');

		$this->model_catalog_review->addReview($product_id, [
			'author' => $author,
			'text'   => $text,
			'rating' => $rating
		]);

		$this->ok([], $this->t('text_success'));
	}
}
