<?php
namespace Opencart\Catalog\Controller\Extension\MobileApi\Api;
/**
 * Class Cart
 *
 * GET  extension/mobile_api/api/cart.index
 * POST extension/mobile_api/api/cart.add            {product_id, quantity, option: {product_option_id: value|[values]}, subscription_plan_id}
 * POST extension/mobile_api/api/cart.edit           {key, quantity}
 * POST extension/mobile_api/api/cart.remove         {key}
 * POST extension/mobile_api/api/cart.clear
 * POST extension/mobile_api/api/cart.coupon         {coupon}      (empty coupon removes it)
 *
 * Adding products is delegated to OpenCart 4.1.0.4's own API controller
 * (catalog/controller/api/cart.php -> addProduct) so stock, option, variant and
 * subscription validation behaves exactly like the core API. Totals come from
 * api/cart.getTotals.
 *
 * @package Opencart\Catalog\Controller\Extension\MobileApi\Api
 */
class Cart extends \Opencart\System\Library\Extension\MobileApi\ApiController {
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

		// api/cart.addProduct reads product_id, quantity, option and subscription_plan_id from POST.
		$this->request->post['quantity'] = max(1, (int)$this->post('quantity', 1));

		if (isset($this->request->post['option']) && !is_array($this->request->post['option'])) {
			$this->request->post['option'] = [];
		}

		$result = $this->load->controller('api/cart.addProduct');

		if (!is_array($result)) {
			$this->fail('Could not add the product to the cart.');

			return;
		}

		if (isset($result['error'])) {
			$errors = (array)$result['error'];

			$this->fail((string)($errors['warning'] ?? reset($errors)), $errors, 422);

			return;
		}

		$this->resetCheckout();

		$this->ok($this->summary(), $this->decode((string)($result['success'] ?? '')));
	}

	/**
	 * @return void
	 */
	public function edit(): void {
		if (!$this->guard()) {
			return;
		}

		$key = (int)$this->post('key', 0);
		$quantity = (int)$this->post('quantity', 1);

		if ($quantity < 1) {
			$this->cart->remove($key);
		} else {
			$this->cart->update($key, $quantity);
		}

		$this->resetCheckout();

		$this->ok($this->summary());
	}

	/**
	 * @return void
	 */
	public function remove(): void {
		if (!$this->guard()) {
			return;
		}

		$this->cart->remove((int)$this->post('key', 0));

		$this->resetCheckout();

		$this->ok($this->summary());
	}

	/**
	 * @return void
	 */
	public function clear(): void {
		if (!$this->guard()) {
			return;
		}

		$this->cart->clear();

		$this->resetCheckout();

		unset($this->session->data['coupon']);

		$this->ok($this->summary());
	}

	/**
	 * Apply or remove a coupon. Mirrors extension/opencart/checkout/coupon.save.
	 *
	 * @return void
	 */
	public function coupon(): void {
		if (!$this->guard()) {
			return;
		}

		$this->load->language('extension/opencart/api/coupon');

		$coupon = trim((string)$this->post('coupon', ''));

		if ($coupon === '') {
			unset($this->session->data['coupon']);

			$this->ok($this->summary(), 'Coupon removed.');

			return;
		}

		if (!$this->config->get('total_coupon_status')) {
			$this->fail($this->t('error_status'), [], 422);

			return;
		}

		if (!$this->cart->hasProducts()) {
			$this->fail($this->t('error_product'), [], 422);

			return;
		}

		$this->load->model('marketing/coupon');

		$coupon_info = $this->model_marketing_coupon->getCoupon($coupon);

		if (!$coupon_info) {
			$this->fail($this->t('error_coupon'), ['coupon' => $this->t('error_coupon')], 422);

			return;
		}

		$this->session->data['coupon'] = $coupon;

		$this->resetCheckout();

		$this->ok($this->summary(), $this->t('text_success'));
	}

	/**
	 * Cart payload shared by every cart endpoint.
	 *
	 * @return array<string, mixed>
	 */
	private function summary(): array {
		$show_price = $this->canSeePrice();

		$this->load->model('checkout/cart');

		$products = [];

		foreach ($this->model_checkout_cart->getProducts() as $product) {
			$options = [];

			foreach ($product['option'] as $option) {
				$value = $this->decode((string)$option['value']);

				$options[] = [
					'name'  => $this->decode($option['name']),
					'value' => oc_strlen($value) > 40 ? oc_substr($value, 0, 40) . '…' : $value
				];
			}

			$subscription = '';

			if ($product['subscription']) {
				$subscription = $this->decode($product['subscription']['name'] ?? '');
			}

			$products[] = [
				'key'          => (int)$product['cart_id'],
				'product_id'   => (int)$product['product_id'],
				'name'         => $this->decode($product['name']),
				'model'        => $this->decode($product['model']),
				'thumb'        => $this->image($product['image'], 200, 200),
				'options'      => $options,
				'subscription' => $subscription,
				'quantity'     => (int)$product['quantity'],
				'minimum'      => (int)$product['minimum'],
				'in_stock'     => (bool)($product['stock'] ?? true) && (bool)($product['stock_status'] ?? true),
				'minimum_ok'   => (bool)($product['minimum_status'] ?? true),
				'reward'       => (int)$product['reward'],
				'price'        => $show_price ? $product['price_text'] : '',
				'total'        => $show_price ? $product['total_text'] : ''
			];
		}

		$totals = [];

		if ($show_price && $products) {
			foreach ($this->load->controller('api/cart.getTotals') as $total) {
				$totals[] = [
					'code'  => $total['code'],
					'title' => $this->decode($total['title']),
					'value' => (float)$total['value'],
					'text'  => $total['text']
				];
			}
		}

		$warnings = [];

		if ($products && !$this->cart->hasStock() && !$this->config->get('config_stock_checkout')) {
			$this->load->language('checkout/cart');

			$warnings[] = $this->t('error_stock');
		}

		if ($products && !$this->cart->hasMinimum()) {
			$warnings[] = 'One or more products are below their minimum order quantity.';
		}

		return [
			'products'       => $products,
			'totals'         => $totals,
			'count'          => $this->cart->countProducts(),
			'coupon'         => (string)($this->session->data['coupon'] ?? ''),
			'has_shipping'   => $this->cart->hasShipping(),
			'can_checkout'   => $products && !$warnings && $show_price,
			'warnings'       => $warnings,
			'weight'         => $this->config->get('config_cart_weight') ? $this->weight->format($this->cart->getWeight(), (int)$this->config->get('config_weight_class_id')) : ''
		];
	}

	/**
	 * Same keys checkout/cart.edit clears when the cart changes.
	 *
	 * @return void
	 */
	private function resetCheckout(): void {
		unset($this->session->data['order_id']);
		unset($this->session->data['shipping_method']);
		unset($this->session->data['shipping_methods']);
		unset($this->session->data['payment_method']);
		unset($this->session->data['payment_methods']);
		unset($this->session->data['reward']);
	}
}
