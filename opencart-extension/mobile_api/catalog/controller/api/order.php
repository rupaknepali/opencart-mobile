<?php
namespace Opencart\Catalog\Controller\Extension\MobileApi\Api;
/**
 * Class Order
 *
 * GET  extension/mobile_api/api/order.index&page=1
 * GET  extension/mobile_api/api/order.info&order_id=12
 * POST extension/mobile_api/api/order.reorder   {order_id, order_product_id}
 *
 * @package Opencart\Catalog\Controller\Extension\MobileApi\Api
 */
class Order extends \Opencart\System\Library\Extension\MobileApi\ApiController {
	/**
	 * Order history for the logged in customer.
	 *
	 * @return void
	 */
	public function index(): void {
		if (!$this->guardCustomer()) {
			return;
		}

		$this->load->model('account/order');
		$this->load->model('localisation/order_status');

		$page = max(1, (int)$this->query('page', 1));
		$limit = 10;

		$orders = [];

		foreach ($this->model_account_order->getOrders(($page - 1) * $limit, $limit) as $order) {
			$order_status_info = $this->model_localisation_order_status->getOrderStatus((int)$order['order_status_id']);

			$orders[] = [
				'order_id'   => (int)$order['order_id'],
				'name'       => $this->decode($order['firstname'] . ' ' . $order['lastname']),
				'status'     => $order_status_info ? $this->decode($order_status_info['name']) : '',
				'date_added' => date($this->language->get('date_format_short'), strtotime($order['date_added'])),
				'products'   => $this->model_account_order->getTotalProductsByOrderId((int)$order['order_id']),
				'total'      => $this->currency->format((float)$order['total'], $order['currency_code'], (float)$order['currency_value'])
			];
		}

		$total = $this->model_account_order->getTotalOrders();

		$this->ok([
			'orders' => $orders,
			'total'  => (int)$total,
			'page'   => $page,
			'pages'  => (int)ceil($total / $limit)
		]);
	}

	/**
	 * @return void
	 */
	public function info(): void {
		if (!$this->guardCustomer()) {
			return;
		}

		$order_id = (int)$this->query('order_id', 0);

		$this->load->model('account/order');

		$order_info = $this->model_account_order->getOrder($order_id);

		if (!$order_info) {
			$this->fail('Order not found.', [], 404);

			return;
		}

		$this->load->model('catalog/product');

		$products = [];

		foreach ($this->model_account_order->getProducts($order_id) as $product) {
			$options = [];

			foreach ($this->model_account_order->getOptions($order_id, (int)$product['order_product_id']) as $option) {
				$options[] = [
					'name'  => $this->decode($option['name']),
					'value' => $this->decode($option['type'] == 'file' ? '' : (string)$option['value'])
				];
			}

			$product_info = $this->model_catalog_product->getProduct((int)$product['product_id']);

			$products[] = [
				'order_product_id' => (int)$product['order_product_id'],
				'product_id'       => (int)$product['product_id'],
				'name'             => $this->decode($product['name']),
				'model'            => $this->decode($product['model']),
				'thumb'            => $this->image($product_info ? (string)$product_info['image'] : '', 200, 200),
				'options'          => $options,
				'quantity'         => (int)$product['quantity'],
				'price'            => $this->currency->format((float)$product['price'] + ($this->config->get('config_tax') ? (float)$product['tax'] : 0), $order_info['currency_code'], (float)$order_info['currency_value']),
				'total'            => $this->currency->format((float)$product['total'] + ($this->config->get('config_tax') ? ((float)$product['tax'] * (int)$product['quantity']) : 0), $order_info['currency_code'], (float)$order_info['currency_value']),
				'reorder'          => (bool)$product_info
			];
		}

		$totals = [];

		foreach ($this->model_account_order->getTotals($order_id) as $total) {
			$totals[] = [
				'title' => $this->decode($total['title']),
				'text'  => $this->currency->format((float)$total['value'], $order_info['currency_code'], (float)$order_info['currency_value'])
			];
		}

		$histories = [];

		foreach ($this->model_account_order->getHistories($order_id) as $history) {
			$histories[] = [
				'date_added' => date($this->language->get('date_format_short'), strtotime($history['date_added'])),
				'status'     => $this->decode((string)$history['status']),
				'comment'    => $history['notify'] ? $this->decode(nl2br((string)$history['comment'])) : ''
			];
		}

		$payment_method = is_array($order_info['payment_method']) ? ($order_info['payment_method']['name'] ?? '') : (string)$order_info['payment_method'];
		$shipping_method = is_array($order_info['shipping_method']) ? ($order_info['shipping_method']['name'] ?? '') : (string)$order_info['shipping_method'];

		$this->ok([
			'order' => [
				'order_id'         => (int)$order_info['order_id'],
				'invoice'          => $order_info['invoice_no'] ? $order_info['invoice_prefix'] . $order_info['invoice_no'] : '',
				'date_added'       => date($this->language->get('date_format_short'), strtotime($order_info['date_added'])),
				'status'           => $histories ? $histories[count($histories) - 1]['status'] : '',
				'payment_method'   => $this->decode($payment_method),
				'shipping_method'  => $this->decode($shipping_method),
				'payment_address'  => $this->formatAddress($order_info, 'payment'),
				'shipping_address' => $this->formatAddress($order_info, 'shipping'),
				'comment'          => $this->decode((string)$order_info['comment']),
				'products'         => $products,
				'totals'           => $totals,
				'histories'        => $histories
			]
		]);
	}

	/**
	 * Add a product from a past order back into the cart.
	 *
	 * @return void
	 */
	public function reorder(): void {
		if (!$this->guardCustomer()) {
			return;
		}

		$order_id = (int)$this->post('order_id', 0);
		$order_product_id = (int)$this->post('order_product_id', 0);

		$this->load->model('account/order');

		$order_info = $this->model_account_order->getOrder($order_id);

		$product = $order_info ? $this->model_account_order->getProduct($order_id, $order_product_id) : [];

		if (!$product) {
			$this->fail('Product not found in this order.', [], 404);

			return;
		}

		$this->load->model('catalog/product');

		if (!$this->model_catalog_product->getProduct((int)$product['product_id'])) {
			$this->fail('This product is no longer available.', [], 404);

			return;
		}

		$option_data = [];

		foreach ($this->model_account_order->getOptions($order_id, $order_product_id) as $option) {
			if ($option['type'] == 'select' || $option['type'] == 'radio') {
				$option_data[$option['product_option_id']] = $option['product_option_value_id'];
			} elseif ($option['type'] == 'checkbox') {
				$option_data[$option['product_option_id']][] = $option['product_option_value_id'];
			} else {
				$option_data[$option['product_option_id']] = $option['value'];
			}
		}

		$subscription_info = $this->model_account_order->getSubscription($order_id, $order_product_id);

		$this->cart->add((int)$product['product_id'], (int)$product['quantity'], $option_data, $subscription_info ? (int)$subscription_info['subscription_plan_id'] : 0);

		unset($this->session->data['shipping_method'], $this->session->data['shipping_methods'], $this->session->data['payment_method'], $this->session->data['payment_methods']);

		$this->ok(['cart_count' => $this->cart->countProducts()], 'Product added to your cart.');
	}

	/**
	 * @param array<string, mixed> $order_info
	 * @param string               $type payment|shipping
	 *
	 * @return string multi-line address
	 */
	private function formatAddress(array $order_info, string $type): string {
		if (empty($order_info[$type . '_firstname'])) {
			return '';
		}

		$lines = [
			$order_info[$type . '_firstname'] . ' ' . $order_info[$type . '_lastname'],
			$order_info[$type . '_company'],
			$order_info[$type . '_address_1'],
			$order_info[$type . '_address_2'],
			trim($order_info[$type . '_city'] . ' ' . $order_info[$type . '_postcode']),
			$order_info[$type . '_zone'],
			$order_info[$type . '_country']
		];

		return $this->decode(implode("\n", array_filter(array_map('trim', $lines))));
	}
}
