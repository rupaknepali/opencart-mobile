<?php
namespace Opencart\Catalog\Controller\Extension\MobileApi\Api;
/**
 * Class Wishlist
 *
 * GET  extension/mobile_api/api/wishlist.index
 * POST extension/mobile_api/api/wishlist.add      {product_id}
 * POST extension/mobile_api/api/wishlist.remove   {product_id}
 *
 * Guests get a session wishlist which is merged into the account on login
 * (same behaviour as account/wishlist in the storefront).
 *
 * @package Opencart\Catalog\Controller\Extension\MobileApi\Api
 */
class Wishlist extends \Opencart\System\Library\Extension\MobileApi\ApiController {
	/**
	 * @return void
	 */
	public function index(): void {
		if (!$this->guard()) {
			return;
		}

		$this->ok($this->summary());
	}

	/**
	 * @return void
	 */
	public function add(): void {
		if (!$this->guard()) {
			return;
		}

		$product_id = (int)$this->post('product_id', 0);

		$this->load->model('catalog/product');

		if (!$this->model_catalog_product->getProduct($product_id)) {
			$this->fail('Product not found.', [], 404);

			return;
		}

		if ($this->customer->isLogged()) {
			$this->load->model('account/wishlist');

			$this->model_account_wishlist->addWishlist($this->customer->getId(), $product_id);
		} else {
			if (!isset($this->session->data['wishlist']) || !is_array($this->session->data['wishlist'])) {
				$this->session->data['wishlist'] = [];
			}

			if (!in_array($product_id, $this->session->data['wishlist'])) {
				$this->session->data['wishlist'][] = $product_id;
			}
		}

		$this->ok($this->summary(), 'Added to your wishlist.');
	}

	/**
	 * @return void
	 */
	public function remove(): void {
		if (!$this->guard()) {
			return;
		}

		$product_id = (int)$this->post('product_id', 0);

		if ($this->customer->isLogged()) {
			$this->load->model('account/wishlist');

			$this->model_account_wishlist->deleteWishlists($this->customer->getId(), $product_id);
		} elseif (isset($this->session->data['wishlist']) && is_array($this->session->data['wishlist'])) {
			$this->session->data['wishlist'] = array_values(array_diff($this->session->data['wishlist'], [$product_id]));
		}

		$this->ok($this->summary(), 'Removed from your wishlist.');
	}

	/**
	 * @return array<string, mixed>
	 */
	private function summary(): array {
		$ids = [];

		if ($this->customer->isLogged()) {
			$this->load->model('account/wishlist');

			foreach ($this->model_account_wishlist->getWishlist($this->customer->getId()) as $item) {
				$ids[] = (int)$item['product_id'];
			}
		} elseif (!empty($this->session->data['wishlist'])) {
			$ids = array_map('intval', (array)$this->session->data['wishlist']);
		}

		$this->load->model('catalog/product');

		$products = [];

		foreach ($ids as $product_id) {
			$product_info = $this->model_catalog_product->getProduct($product_id);

			if ($product_info) {
				$products[] = $this->productCard($product_info);
			}
		}

		return [
			'products'    => $products,
			'product_ids' => array_column($products, 'product_id')
		];
	}
}
