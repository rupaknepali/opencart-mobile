<?php
namespace Opencart\Catalog\Controller\Extension\MobileApi\Api;
/**
 * Class Checkout
 *
 * Session based checkout that follows the same steps and session keys as the
 * OpenCart 4.1.0.4 storefront checkout (catalog/controller/checkout/*), so
 * every installed shipping, payment and order total extension keeps working.
 *
 * GET  extension/mobile_api/api/checkout.index              current checkout state
 * POST extension/mobile_api/api/checkout.guest              {firstname, lastname, email, telephone}
 * POST extension/mobile_api/api/checkout.shippingAddress    {address_id} | {firstname, lastname, ..., save?}
 * POST extension/mobile_api/api/checkout.paymentAddress     {address_id} | {firstname, lastname, ..., save?}
 * GET  extension/mobile_api/api/checkout.shippingMethods
 * POST extension/mobile_api/api/checkout.shippingMethod     {code: "flat.flat"}
 * GET  extension/mobile_api/api/checkout.paymentMethods
 * POST extension/mobile_api/api/checkout.paymentMethod      {code: "cod.cod"}
 * POST extension/mobile_api/api/checkout.confirm            {comment, agree}
 * GET  extension/mobile_api/api/checkout.pay&session_token= HTML page for online payment gateways (web view)
 *
 * @package Opencart\Catalog\Controller\Extension\MobileApi\Api
 */
class Checkout extends \Opencart\System\Library\Extension\MobileApi\ApiController {
	/**
	 * Payment extensions that complete without leaving the app. Anything else is
	 * paid through the payment web view (checkout.pay).
	 *
	 * @var array<int, string>
	 */
	private array $offline_payments = ['cod', 'cheque', 'bank_transfer', 'free_checkout'];

	/**
	 * @return void
	 */
	public function index(): void {
		if (!$this->guard()) {
			return;
		}

		$this->ok($this->state());
	}

	/**
	 * Guest customer details. Mirrors checkout/register.save for guests.
	 *
	 * @return void
	 */
	public function guest(): void {
		if (!$this->guard()) {
			return;
		}

		if ($this->customer->isLogged()) {
			$this->fail('You are already logged in.', [], 409);

			return;
		}

		if (!$this->guestAllowed()) {
			$this->fail('Guest checkout is not available for this cart. Please log in or create an account.', [], 403);

			return;
		}

		$this->load->language('checkout/register');

		$post_info = $this->request->post + ['firstname' => '', 'lastname' => '', 'email' => '', 'telephone' => ''];

		$errors = [];

		if (!oc_validate_length((string)$post_info['firstname'], 1, 32)) {
			$errors['firstname'] = $this->t('error_firstname');
		}

		if (!oc_validate_length((string)$post_info['lastname'], 1, 32)) {
			$errors['lastname'] = $this->t('error_lastname');
		}

		if (!oc_validate_email((string)$post_info['email'])) {
			$errors['email'] = $this->t('error_email');
		}

		if ($this->config->get('config_telephone_required') && !oc_validate_length((string)$post_info['telephone'], 3, 32)) {
			$errors['telephone'] = $this->t('error_telephone');
		}

		if ($errors) {
			$this->fail(reset($errors), $errors, 422);

			return;
		}

		$this->session->data['customer'] = [
			'customer_id'       => 0,
			'customer_group_id' => (int)$this->config->get('config_customer_group_id'),
			'firstname'         => $post_info['firstname'],
			'lastname'          => $post_info['lastname'],
			'email'             => $post_info['email'],
			'telephone'         => $post_info['telephone'],
			'custom_field'      => []
		];

		$this->session->data['guest'] = true;

		$this->clearMethods();

		$this->ok($this->state());
	}

	/**
	 * @return void
	 */
	public function shippingAddress(): void {
		if (!$this->guard() || !$this->requireCheckoutCustomer()) {
			return;
		}

		if (!$this->cart->hasShipping()) {
			$this->fail('This order does not require shipping.', [], 422);

			return;
		}

		$address = $this->resolveAddress();

		if ($address === null) {
			return;
		}

		$this->session->data['shipping_address'] = $address;

		// Shipping address changes the tax and the available shipping methods
		$this->tax->setShippingAddress((int)$address['country_id'], (int)$address['zone_id']);

		$this->clearMethods();

		$this->ok($this->state());
	}

	/**
	 * @return void
	 */
	public function paymentAddress(): void {
		if (!$this->guard() || !$this->requireCheckoutCustomer()) {
			return;
		}

		$address = $this->resolveAddress();

		if ($address === null) {
			return;
		}

		$this->session->data['payment_address'] = $address;

		$this->tax->setPaymentAddress((int)$address['country_id'], (int)$address['zone_id']);

		unset($this->session->data['payment_method']);
		unset($this->session->data['payment_methods']);

		$this->ok($this->state());
	}

	/**
	 * Quote every enabled shipping extension for the session shipping address.
	 *
	 * @return void
	 */
	public function shippingMethods(): void {
		if (!$this->guard() || !$this->requireCheckoutCustomer() || !$this->requireCart()) {
			return;
		}

		$this->load->language('checkout/shipping_method');

		if (!$this->cart->hasShipping()) {
			$this->ok(['shipping_methods' => [], 'shipping_required' => false]);

			return;
		}

		if (!isset($this->session->data['shipping_address']['address_id'])) {
			$this->fail($this->t('error_shipping_address'), [], 422);

			return;
		}

		$this->load->model('checkout/shipping_method');

		$shipping_methods = $this->model_checkout_shipping_method->getMethods($this->session->data['shipping_address']);

		if (!$shipping_methods) {
			$this->fail(strip_tags(sprintf($this->t('error_no_shipping'), '')), [], 422);

			return;
		}

		$this->session->data['shipping_methods'] = $shipping_methods;

		$methods = [];

		foreach ($shipping_methods as $method) {
			$quotes = [];

			foreach ((array)($method['quote'] ?? []) as $quote) {
				$quotes[] = [
					'code' => $quote['code'],
					'name' => $this->decode((string)($quote['name'] ?? $quote['title'] ?? '')),
					'cost' => (float)$quote['cost'],
					'text' => $this->decode((string)$quote['text'])
				];
			}

			$methods[] = [
				'code'   => $method['code'] ?? '',
				'name'   => $this->decode((string)($method['name'] ?? $method['title'] ?? '')),
				'error'  => !empty($method['error']) ? $this->decode(strip_tags((string)$method['error'])) : '',
				'quotes' => $quotes
			];
		}

		$this->ok([
			'shipping_methods' => $methods,
			'shipping_required' => true,
			'selected'          => $this->session->data['shipping_method']['code'] ?? ''
		]);
	}

	/**
	 * Select a shipping quote. The quote must come from the server-side list
	 * returned by shippingMethods so the client cannot set its own price.
	 *
	 * @return void
	 */
	public function shippingMethod(): void {
		if (!$this->guard() || !$this->requireCheckoutCustomer() || !$this->requireCart()) {
			return;
		}

		$this->load->language('checkout/shipping_method');

		$code = (string)$this->post('code', '');

		$shipping = explode('.', $code);

		if (!isset($shipping[0]) || !isset($shipping[1]) || !isset($this->session->data['shipping_methods'][$shipping[0]]['quote'][$shipping[1]])) {
			$this->fail($this->t('error_shipping_method'), [], 422);

			return;
		}

		$this->session->data['shipping_method'] = $this->session->data['shipping_methods'][$shipping[0]]['quote'][$shipping[1]];

		unset($this->session->data['payment_method']);
		unset($this->session->data['payment_methods']);

		$this->ok($this->state());
	}

	/**
	 * @return void
	 */
	public function paymentMethods(): void {
		if (!$this->guard() || !$this->requireCheckoutCustomer() || !$this->requireCart()) {
			return;
		}

		$this->load->language('checkout/payment_method');

		if ($this->config->get('config_checkout_payment_address') && !isset($this->session->data['payment_address'])) {
			$this->fail($this->t('error_payment_address'), [], 422);

			return;
		}

		if ($this->cart->hasShipping()) {
			if (!isset($this->session->data['shipping_address']['address_id'])) {
				$this->fail($this->t('error_shipping_address'), [], 422);

				return;
			}

			if (!isset($this->session->data['shipping_method'])) {
				$this->fail($this->t('error_shipping_method'), [], 422);

				return;
			}
		}

		$payment_address = $this->session->data['payment_address'] ?? ($this->session->data['shipping_address'] ?? []);

		$this->load->model('checkout/payment_method');

		$payment_methods = $this->model_checkout_payment_method->getMethods($payment_address);

		if (!$payment_methods) {
			$this->fail(strip_tags(sprintf($this->t('error_no_payment'), '')), [], 422);

			return;
		}

		$this->session->data['payment_methods'] = $payment_methods;

		$methods = [];

		foreach ($payment_methods as $method) {
			$options = [];

			foreach ((array)($method['option'] ?? []) as $option) {
				$options[] = [
					'code'    => $option['code'],
					'name'    => $this->decode(strip_tags((string)$option['name']))
				];
			}

			$methods[] = [
				'code'    => $method['code'],
				'name'    => $this->decode(strip_tags((string)$method['name'])),
				'native'  => in_array($method['code'], $this->offline_payments),
				'options' => $options
			];
		}

		$this->ok([
			'payment_methods' => $methods,
			'selected'        => $this->session->data['payment_method']['code'] ?? ''
		]);
	}

	/**
	 * @return void
	 */
	public function paymentMethod(): void {
		if (!$this->guard() || !$this->requireCheckoutCustomer() || !$this->requireCart()) {
			return;
		}

		$this->load->language('checkout/payment_method');

		$payment = explode('.', (string)$this->post('code', ''));

		if (!isset($payment[0]) || !isset($payment[1]) || !isset($this->session->data['payment_methods'][$payment[0]]['option'][$payment[1]])) {
			$this->fail($this->t('error_payment_method'), [], 422);

			return;
		}

		$this->session->data['payment_method'] = $this->session->data['payment_methods'][$payment[0]]['option'][$payment[1]];

		$this->ok($this->state());
	}

	/**
	 * Create (or update) the order, then either complete an offline payment
	 * right away or hand back a payment page URL for the web view.
	 *
	 * @return void
	 */
	public function confirm(): void {
		if (!$this->guard() || !$this->requireCheckoutCustomer() || !$this->requireCart()) {
			return;
		}

		$this->session->data['comment'] = strip_tags((string)$this->post('comment', ''));
		$this->session->data['agree'] = (bool)$this->post('agree', false);

		$errors = $this->validateConfirm();

		if ($errors) {
			$this->fail(reset($errors), $errors, 422);

			return;
		}

		$order_id = $this->saveOrder();

		if (!$order_id) {
			$this->fail('The order could not be created.', [], 500);

			return;
		}

		$code = oc_substr($this->session->data['payment_method']['code'], 0, strpos($this->session->data['payment_method']['code'], '.'));

		$this->load->model('setting/extension');

		$extension_info = $this->model_setting_extension->getExtensionByCode('payment', $code);

		if (!$extension_info) {
			$this->fail('The selected payment method is not available.', [], 422);

			return;
		}

		// Offline payments: run the payment extension's own confirm() and read its JSON
		if ($extension_info['extension'] == 'opencart' && in_array($code, $this->offline_payments)) {
			$this->load->controller('extension/opencart/payment/' . $code . '.confirm');

			$result = json_decode((string)$this->response->getOutput(), true) ?: [];

			if (!empty($result['error'])) {
				$this->fail(is_array($result['error']) ? (string)reset($result['error']) : (string)$result['error'], [], 422);

				return;
			}

			if (!empty($result['redirect']) && str_contains(html_entity_decode((string)$result['redirect']), 'checkout/success')) {
				$this->completeOrder();

				$this->ok([
					'order_id' => $order_id,
					'status'   => 'complete'
				], 'Your order has been placed!');

				return;
			}

			$this->fail('The payment could not be completed.', [], 422);

			return;
		}

		// Online gateways: finish payment in a web view that shares this session
		$this->ok([
			'order_id'    => $order_id,
			'status'      => 'payment_required',
			'payment_url' => $this->decode($this->url->link('extension/mobile_api/api/checkout.pay', 'language=' . $this->config->get('config_language') . '&session_token=' . $this->session->getId())),
			'success_url' => 'checkout/success',
			'failure_url' => 'checkout/failure'
		]);
	}

	/**
	 * Minimal HTML page that renders the selected payment extension's form, so
	 * any OpenCart payment gateway (PayPal, Stripe, ...) works inside the app's
	 * web view. The session cookie is set to the app's session so the gateway's
	 * own AJAX calls and the final checkout/success page see the same order.
	 *
	 * @return void
	 */
	public function pay(): void {
		if (!$this->config->get('module_mobile_api_status')) {
			$this->response->setOutput('Mobile API disabled.');

			return;
		}

		// The token was already applied by the startup; make the browser keep it.
		setcookie($this->config->get('session_name'), $this->session->getId(), [
			'expires'  => time() + (int)$this->config->get('config_session_expire'),
			'path'     => $this->config->get('session_path'),
			'secure'   => (bool)$this->request->server['HTTPS'],
			'httponly' => true,
			'samesite' => 'Lax'
		]);

		$this->load->language('checkout/confirm');

		$payment = '';
		$error = '';

		if (!isset($this->session->data['order_id']) || !isset($this->session->data['payment_method']['code'])) {
			$error = 'No order is waiting for payment. Please return to the app and try again.';
		} else {
			$code = oc_substr($this->session->data['payment_method']['code'], 0, strpos($this->session->data['payment_method']['code'], '.'));

			$this->load->model('setting/extension');

			$extension_info = $this->model_setting_extension->getExtensionByCode('payment', $code);

			if ($extension_info) {
				$payment = (string)$this->load->controller('extension/' . $extension_info['extension'] . '/payment/' . $extension_info['code']);
			} else {
				$error = 'The selected payment method is not available.';
			}
		}

		// Order summary
		$rows = '';

		$this->load->model('checkout/cart');

		foreach ($this->model_checkout_cart->getProducts() as $product) {
			$rows .= '<tr><td>' . $product['name'] . ' &times; ' . (int)$product['quantity'] . '</td><td class="text-end">' . $product['total_text'] . '</td></tr>';
		}

		foreach ($this->load->controller('api/cart.getTotals') as $total) {
			$rows .= '<tr><th>' . $total['title'] . '</th><th class="text-end">' . $total['text'] . '</th></tr>';
		}

		$scripts = '';

		foreach ($this->document->getScripts('header') + $this->document->getScripts('footer') as $script) {
			$scripts .= '<script src="' . $script['href'] . '"></script>';
		}

		$styles = '';

		foreach ($this->document->getStyles() as $style) {
			$styles .= '<link rel="' . $style['rel'] . '" href="' . $style['href'] . '" media="' . $style['media'] . '"/>';
		}

		$base = $this->config->get('config_url');
		$title = $this->config->get('config_name');

		$html = '<!DOCTYPE html><html><head><meta charset="UTF-8"/>'
			. '<meta name="viewport" content="width=device-width, initial-scale=1"/>'
			. '<base href="' . $base . '"/>'
			. '<title>' . $title . '</title>'
			. '<script src="catalog/view/javascript/jquery/jquery-3.7.1.min.js"></script>'
			. '<link href="catalog/view/stylesheet/bootstrap.css" rel="stylesheet"/>'
			. '<link href="catalog/view/stylesheet/fonts/fontawesome/css/all.min.css" rel="stylesheet"/>'
			. '<link href="catalog/view/stylesheet/stylesheet.css" rel="stylesheet"/>'
			. '<script src="catalog/view/javascript/common.js"></script>'
			. $styles . $scripts
			. '</head><body>'
			. '<div id="alert" class="toast-container position-fixed top-0 end-0 p-3"></div>'
			. '<div class="container py-3">'
			. '<h5 class="mb-3">' . 'Payment' . '</h5>'
			. ($error ? '<div class="alert alert-danger">' . $error . '</div>' : '')
			. ($rows ? '<table class="table table-sm mb-4">' . $rows . '</table>' : '')
			. '<div id="payment">' . $payment . '</div>'
			. '</div>'
			. '<script src="catalog/view/javascript/bootstrap/js/bootstrap.bundle.min.js"></script>'
			. '</body></html>';

		$this->response->addHeader('Content-Type: text/html; charset=utf-8');
		$this->response->addHeader('Cache-Control: no-store');
		$this->response->setOutput($html);
	}

	/**
	 * Called by the app after the web view reaches checkout/success, in case the
	 * gateway's success page was not loaded with this session.
	 *
	 * POST extension/mobile_api/api/checkout.complete
	 *
	 * @return void
	 */
	public function complete(): void {
		if (!$this->guard()) {
			return;
		}

		$order_id = (int)($this->session->data['order_id'] ?? 0);

		$this->load->model('checkout/order');

		$order_info = $order_id ? $this->model_checkout_order->getOrder($order_id) : [];

		if ($order_info && (int)$order_info['order_status_id'] > 0) {
			$this->completeOrder();

			$this->ok(['order_id' => $order_id, 'status' => 'complete']);

			return;
		}

		$this->ok(['order_id' => $order_id, 'status' => $order_id ? 'pending' : 'none']);
	}

	/**
	 * Current checkout state for the app to render.
	 *
	 * @return array<string, mixed>
	 */
	private function state(): array {
		$addresses = [];

		if ($this->customer->isLogged()) {
			$this->load->model('account/address');

			foreach ($this->model_account_address->getAddresses($this->customer->getId()) as $address) {
				$addresses[] = $this->addressPayload($address);
			}
		}

		$customer = $this->session->data['customer'] ?? null;

		// Logged in customers always have their account data in the session
		if (!$customer && $this->customer->isLogged()) {
			$this->load->model('account/customer');

			$customer_info = $this->model_account_customer->getCustomer($this->customer->getId());

			$customer = $this->session->data['customer'] = [
				'customer_id'       => (int)$customer_info['customer_id'],
				'customer_group_id' => (int)$customer_info['customer_group_id'],
				'firstname'         => $customer_info['firstname'],
				'lastname'          => $customer_info['lastname'],
				'email'             => $customer_info['email'],
				'telephone'         => $customer_info['telephone'],
				'custom_field'      => json_decode((string)$customer_info['custom_field'], true) ?: []
			];
		}

		// Totals
		$totals = [];

		if ($this->cart->hasProducts() && $this->canSeePrice()) {
			foreach ($this->load->controller('api/cart.getTotals') as $total) {
				$totals[] = [
					'code'  => $total['code'],
					'title' => $this->decode($total['title']),
					'value' => (float)$total['value'],
					'text'  => $total['text']
				];
			}
		}

		// Terms
		$terms = null;

		if ($this->config->get('config_checkout_id')) {
			$this->load->model('catalog/information');

			$information_info = $this->model_catalog_information->getInformation((int)$this->config->get('config_checkout_id'));

			if ($information_info) {
				$terms = [
					'information_id' => (int)$information_info['information_id'],
					'title'          => $this->decode($information_info['title'])
				];
			}
		}

		return [
			'logged'                   => $this->customer->isLogged(),
			'guest_allowed'            => $this->guestAllowed(),
			'customer'                 => $customer ? [
				'firstname' => $this->decode((string)$customer['firstname']),
				'lastname'  => $this->decode((string)$customer['lastname']),
				'email'     => (string)$customer['email'],
				'telephone' => (string)$customer['telephone']
			] : null,
			'addresses'                => $addresses,
			'shipping_required'        => $this->cart->hasShipping(),
			'payment_address_required' => (bool)$this->config->get('config_checkout_payment_address'),
			'shipping_address'         => isset($this->session->data['shipping_address']) ? $this->addressPayload($this->session->data['shipping_address']) : null,
			'payment_address'          => isset($this->session->data['payment_address']) ? $this->addressPayload($this->session->data['payment_address']) : null,
			'shipping_method'          => isset($this->session->data['shipping_method']) ? [
				'code' => $this->session->data['shipping_method']['code'],
				'name' => $this->decode((string)$this->session->data['shipping_method']['name']),
				'text' => $this->decode((string)($this->session->data['shipping_method']['text'] ?? ''))
			] : null,
			'payment_method'           => isset($this->session->data['payment_method']) ? [
				'code' => $this->session->data['payment_method']['code'],
				'name' => $this->decode(strip_tags((string)$this->session->data['payment_method']['name']))
			] : null,
			'comment'                  => (string)($this->session->data['comment'] ?? ''),
			'terms'                    => $terms,
			'totals'                   => $totals,
			'cart_count'               => $this->cart->countProducts()
		];
	}

	/**
	 * @return bool
	 */
	private function guestAllowed(): bool {
		return $this->config->get('config_checkout_guest') && !$this->config->get('config_customer_price') && !$this->cart->hasDownload() && !$this->cart->hasSubscription();
	}

	/**
	 * Checkout steps need a customer in the session (logged in or guest).
	 *
	 * @return bool
	 */
	private function requireCheckoutCustomer(): bool {
		if ($this->customer->isLogged() && !isset($this->session->data['customer'])) {
			$this->state();
		}

		if (!isset($this->session->data['customer'])) {
			$this->fail('Please log in or enter your details as a guest first.', ['customer' => 'required'], 401);

			return false;
		}

		return true;
	}

	/**
	 * @return bool
	 */
	private function requireCart(): bool {
		if (!$this->cart->hasProducts() || (!$this->cart->hasStock() && !$this->config->get('config_stock_checkout')) || !$this->cart->hasMinimum()) {
			$this->fail('Your cart is empty or has products that are out of stock.', ['cart' => 'invalid'], 409);

			return false;
		}

		return true;
	}

	/**
	 * Address from a saved address_id (logged in) or from posted fields.
	 * Outputs the error and returns null on failure.
	 *
	 * @return array<string, mixed>|null
	 */
	private function resolveAddress(): ?array {
		$address_id = (int)$this->post('address_id', 0);

		if ($address_id) {
			if (!$this->customer->isLogged()) {
				$this->fail('Please log in to use a saved address.', [], 401);

				return null;
			}

			$this->load->model('account/address');

			$address_info = $this->model_account_address->getAddress($this->customer->getId(), $address_id);

			if (!$address_info) {
				$this->fail('Address not found.', [], 404);

				return null;
			}

			return $address_info;
		}

		$data = [
			'firstname'    => (string)$this->post('firstname'),
			'lastname'     => (string)$this->post('lastname'),
			'company'      => (string)$this->post('company'),
			'address_1'    => (string)$this->post('address_1'),
			'address_2'    => (string)$this->post('address_2'),
			'city'         => (string)$this->post('city'),
			'postcode'     => (string)$this->post('postcode'),
			'country_id'   => (int)$this->post('country_id', 0),
			'zone_id'      => (int)$this->post('zone_id', 0),
			'custom_field' => (array)$this->post('custom_field', [])
		];

		$errors = $this->validateAddress($data);

		if ($errors) {
			$this->fail(reset($errors), $errors, 422);

			return null;
		}

		// Logged in customers can save the new address to their address book
		if ($this->customer->isLogged() && $this->post('save', false)) {
			$this->load->model('account/address');

			$data['default'] = !$this->model_account_address->getTotalAddresses($this->customer->getId());

			$new_id = $this->model_account_address->addAddress($this->customer->getId(), $data);

			return $this->model_account_address->getAddress($this->customer->getId(), $new_id);
		}

		return $this->buildSessionAddress($data, 0);
	}

	/**
	 * Same checks as checkout/confirm.index.
	 *
	 * @return array<string, string>
	 */
	private function validateConfirm(): array {
		$this->load->language('checkout/checkout');

		$errors = [];

		if (!$this->canSeePrice()) {
			$errors['customer'] = 'Please log in to place an order.';
		}

		if ($this->cart->hasShipping()) {
			if (!isset($this->session->data['shipping_address']['address_id'])) {
				$errors['shipping_address'] = 'Please choose a shipping address.';
			}

			if (!isset($this->session->data['shipping_method'])) {
				$errors['shipping_method'] = 'Please choose a shipping method.';
			}
		} else {
			unset($this->session->data['shipping_address']);
			unset($this->session->data['shipping_method']);
			unset($this->session->data['shipping_methods']);
		}

		if ($this->config->get('config_checkout_payment_address') && !isset($this->session->data['payment_address'])) {
			$errors['payment_address'] = 'Please choose a payment address.';
		}

		if (!isset($this->session->data['payment_method'])) {
			$errors['payment_method'] = 'Please choose a payment method.';
		}

		if ($this->config->get('config_checkout_id') && empty($this->session->data['agree'])) {
			$this->load->model('catalog/information');

			$information_info = $this->model_catalog_information->getInformation((int)$this->config->get('config_checkout_id'));

			if ($information_info) {
				$errors['agree'] = sprintf('You must agree to the %s!', $this->decode($information_info['title']));
			}
		}

		return $errors;
	}

	/**
	 * Build the order exactly like catalog/controller/checkout/confirm.php and
	 * store it with model_checkout_order (order_status_id 0 until paid).
	 *
	 * @return int order_id
	 */
	private function saveOrder(): int {
		$totals = [];
		$taxes = $this->cart->getTaxes();
		$total = 0;

		$this->load->model('checkout/cart');

		($this->model_checkout_cart->getTotals)($totals, $taxes, $total);

		$order_data = [];

		$order_data['invoice_prefix'] = $this->config->get('config_invoice_prefix');
		$order_data['subscription_id'] = 0;

		// Store
		$order_data['store_id'] = $this->config->get('config_store_id');
		$order_data['store_name'] = $this->config->get('config_name');
		$order_data['store_url'] = $this->config->get('config_url');

		// Customer
		$customer = $this->session->data['customer'];

		$order_data['customer_id'] = $customer['customer_id'];
		$order_data['customer_group_id'] = $customer['customer_group_id'];
		$order_data['firstname'] = $customer['firstname'];
		$order_data['lastname'] = $customer['lastname'];
		$order_data['email'] = $customer['email'];
		$order_data['telephone'] = $customer['telephone'];
		$order_data['custom_field'] = $customer['custom_field'] ?? [];

		// Payment address
		$payment_address = $this->config->get('config_checkout_payment_address') ? ($this->session->data['payment_address'] ?? []) : [];

		foreach (['address_id' => 0, 'firstname' => '', 'lastname' => '', 'company' => '', 'address_1' => '', 'address_2' => '', 'city' => '', 'postcode' => '', 'zone' => '', 'zone_id' => 0, 'country' => '', 'country_id' => 0, 'address_format' => '', 'custom_field' => []] as $key => $default) {
			$order_data['payment_' . $key] = $payment_address[$key] ?? $default;
		}

		$order_data['payment_method'] = $this->session->data['payment_method'];

		// Shipping address
		if ($this->cart->hasShipping()) {
			$shipping_address = $this->session->data['shipping_address'];

			$order_data['shipping_method'] = $this->session->data['shipping_method'];
		} else {
			$shipping_address = [];

			$order_data['shipping_method'] = [];
		}

		foreach (['address_id' => 0, 'firstname' => '', 'lastname' => '', 'company' => '', 'address_1' => '', 'address_2' => '', 'city' => '', 'postcode' => '', 'zone' => '', 'zone_id' => 0, 'country' => '', 'country_id' => 0, 'address_format' => '', 'custom_field' => []] as $key => $default) {
			$order_data['shipping_' . $key] = $shipping_address[$key] ?? $default;
		}

		$order_data['comment'] = $this->session->data['comment'] ?? '';

		$order_data['totals'] = $totals;
		$order_data['taxes'] = $taxes;
		$order_data['total'] = $total;

		// Affiliate / marketing tracking
		$order_data['affiliate_id'] = 0;
		$order_data['commission'] = 0;
		$order_data['marketing_id'] = 0;
		$order_data['tracking'] = '';

		if (isset($this->session->data['tracking'])) {
			$subtotal = $this->cart->getSubTotal();

			if ($this->config->get('config_affiliate_status')) {
				$this->load->model('account/affiliate');

				$affiliate_info = $this->model_account_affiliate->getAffiliateByTracking($this->session->data['tracking']);

				if ($affiliate_info) {
					$order_data['affiliate_id'] = $affiliate_info['customer_id'];
					$order_data['commission'] = ($subtotal / 100) * $affiliate_info['commission'];
					$order_data['tracking'] = $this->session->data['tracking'];
				}
			}

			$this->load->model('marketing/marketing');

			$marketing_info = $this->model_marketing_marketing->getMarketingByCode($this->session->data['tracking']);

			if ($marketing_info) {
				$order_data['marketing_id'] = $marketing_info['marketing_id'];
				$order_data['tracking'] = $this->session->data['tracking'];
			}
		}

		$order_data['language_id'] = $this->config->get('config_language_id');
		$order_data['language_code'] = $this->config->get('config_language');

		$order_data['currency_id'] = $this->currency->getId($this->session->data['currency']);
		$order_data['currency_code'] = $this->session->data['currency'];
		$order_data['currency_value'] = $this->currency->getValue($this->session->data['currency']);

		$order_data['ip'] = oc_get_ip();

		if (!empty($this->request->server['HTTP_X_FORWARDED_FOR'])) {
			$order_data['forwarded_ip'] = $this->request->server['HTTP_X_FORWARDED_FOR'];
		} elseif (!empty($this->request->server['HTTP_CLIENT_IP'])) {
			$order_data['forwarded_ip'] = $this->request->server['HTTP_CLIENT_IP'];
		} else {
			$order_data['forwarded_ip'] = '';
		}

		$order_data['user_agent'] = $this->request->server['HTTP_USER_AGENT'] ?? 'OpenCart Mobile App';
		$order_data['accept_language'] = $this->request->server['HTTP_ACCEPT_LANGUAGE'] ?? '';

		// Products
		$order_data['products'] = [];

		foreach ($this->cart->getProducts() as $product) {
			$subscription_data = [];

			if ($product['subscription']) {
				$subscription_data = [
					'quantity'  => $product['quantity'],
					'trial_tax' => $this->tax->getTax($product['subscription']['trial_price'], $product['tax_class_id']),
					'tax'       => $this->tax->getTax($product['subscription']['price'], $product['tax_class_id'])
				] + $product['subscription'];
			}

			$order_data['products'][] = [
				'subscription' => $subscription_data,
				'tax'          => $this->tax->getTax($product['price'], $product['tax_class_id'])
			] + $product;
		}

		$this->load->model('checkout/order');

		$order_id = (int)($this->session->data['order_id'] ?? 0);

		$order_info = $order_id ? $this->model_checkout_order->getOrder($order_id) : [];

		if ($order_info && !$order_info['order_status_id']) {
			// Unpaid order from an earlier attempt: update it
			$this->model_checkout_order->editOrder($order_id, $order_data);
		} else {
			$order_id = $this->model_checkout_order->addOrder($order_data);

			$this->session->data['order_id'] = $order_id;
		}

		return $order_id;
	}

	/**
	 * Same cleanup as checkout/success.
	 *
	 * @return void
	 */
	private function completeOrder(): void {
		$this->cart->clear();

		unset($this->session->data['order_id']);
		unset($this->session->data['payment_method']);
		unset($this->session->data['payment_methods']);
		unset($this->session->data['shipping_method']);
		unset($this->session->data['shipping_methods']);
		unset($this->session->data['comment']);
		unset($this->session->data['agree']);
		unset($this->session->data['coupon']);
		unset($this->session->data['reward']);

		if (!empty($this->session->data['guest'])) {
			unset($this->session->data['customer']);
			unset($this->session->data['guest']);
			unset($this->session->data['shipping_address']);
			unset($this->session->data['payment_address']);
		}
	}

	/**
	 * @return void
	 */
	private function clearMethods(): void {
		unset($this->session->data['shipping_method']);
		unset($this->session->data['shipping_methods']);
		unset($this->session->data['payment_method']);
		unset($this->session->data['payment_methods']);
	}
}
