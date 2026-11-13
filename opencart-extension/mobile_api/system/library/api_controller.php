<?php
namespace Opencart\System\Library\Extension\MobileApi;
/**
 * Class ApiController
 *
 * Shared base class for every Mobile API endpoint.
 *
 * Response envelope:
 *   success: { "success": true,  "data": {...}, "message": "..." }
 *   failure: { "success": false, "error": "...", "errors": { "field": "message" } }
 *
 * @package Opencart\System\Library\Extension\MobileApi
 */
abstract class ApiController extends \Opencart\System\Engine\Controller {
	/**
	 * Validates that the API is enabled and that the client sent the right key.
	 * Every public endpoint calls this first and returns when it fails.
	 *
	 * @return bool
	 */
	protected function guard(): bool {
		if (!$this->config->get('module_mobile_api_status')) {
			$this->fail('The mobile API is disabled.', [], 503);

			return false;
		}

		$key = (string)$this->config->get('module_mobile_api_key');

		$sent = (string)($this->request->server['HTTP_X_API_KEY'] ?? '');

		if ($key === '' || !hash_equals($key, $sent)) {
			$this->fail('Invalid API key.', [], 401);

			return false;
		}

		$this->parseJsonBody();

		return true;
	}

	/**
	 * Guard + require a logged in customer.
	 *
	 * @return bool
	 */
	protected function guardCustomer(): bool {
		if (!$this->guard()) {
			return false;
		}

		if (!$this->customer->isLogged()) {
			$this->fail('Please log in to continue.', [], 401);

			return false;
		}

		return true;
	}

	/**
	 * Accept application/json bodies and merge them into $this->request->post,
	 * cleaned exactly like OpenCart cleans form posts.
	 *
	 * @return void
	 */
	protected function parseJsonBody(): void {
		$type = (string)($this->request->server['CONTENT_TYPE'] ?? $this->request->server['HTTP_CONTENT_TYPE'] ?? '');

		if (stripos($type, 'application/json') === false) {
			return;
		}

		$raw = file_get_contents('php://input');

		if (!$raw) {
			return;
		}

		$data = json_decode($raw, true);

		if (is_array($data)) {
			$this->request->post = $this->request->clean($data) + $this->request->post;
		}
	}

	/**
	 * Read a POST value.
	 *
	 * @param string $key
	 * @param mixed  $default
	 *
	 * @return mixed
	 */
	protected function post(string $key, $default = '') {
		return $this->request->post[$key] ?? $default;
	}

	/**
	 * Read a GET value.
	 *
	 * @param string $key
	 * @param mixed  $default
	 *
	 * @return mixed
	 */
	protected function query(string $key, $default = '') {
		return $this->request->get[$key] ?? $default;
	}

	/**
	 * @param array<string, mixed>|list<mixed> $data
	 * @param string                           $message
	 *
	 * @return void
	 */
	protected function ok(array $data = [], string $message = ''): void {
		$json = ['success' => true, 'data' => $data ?: new \stdClass()];

		if ($message !== '') {
			$json['message'] = $message;
		}

		$this->output($json);
	}

	/**
	 * @param string               $message
	 * @param array<string, mixed> $errors field => message
	 * @param int                  $status  HTTP status code
	 *
	 * @return void
	 */
	protected function fail(string $message, array $errors = [], int $status = 400): void {
		$texts = [
			400 => 'Bad Request',
			401 => 'Unauthorized',
			403 => 'Forbidden',
			404 => 'Not Found',
			409 => 'Conflict',
			422 => 'Unprocessable Entity',
			503 => 'Service Unavailable'
		];

		$protocol = $this->request->server['SERVER_PROTOCOL'] ?? 'HTTP/1.1';

		$this->response->addHeader($protocol . ' ' . $status . ' ' . ($texts[$status] ?? 'Error'));

		$this->output([
			'success' => false,
			'error'   => html_entity_decode($message, ENT_QUOTES, 'UTF-8'),
			'errors'  => $errors ? array_map(fn($e) => is_string($e) ? html_entity_decode($e, ENT_QUOTES, 'UTF-8') : $e, $errors) : new \stdClass()
		]);
	}

	/**
	 * @param array<string, mixed> $json
	 *
	 * @return void
	 */
	private function output(array $json): void {
		$this->response->addHeader('Content-Type: application/json; charset=utf-8');
		$this->response->addHeader('Cache-Control: no-store');
		$this->response->addHeader('X-Session-Token: ' . $this->session->getId());
		$this->response->setOutput(json_encode($json, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
	}

	/**
	 * Strip OpenCart's html escaping for values going to a native client.
	 *
	 * @param string $value
	 *
	 * @return string
	 */
	protected function decode(string $value): string {
		return html_entity_decode($value, ENT_QUOTES, 'UTF-8');
	}

	/**
	 * Whether prices may be shown to the current visitor.
	 *
	 * @return bool
	 */
	protected function canSeePrice(): bool {
		return $this->customer->isLogged() || !$this->config->get('config_customer_price');
	}

	/**
	 * Format a raw price with tax for display in the current currency.
	 *
	 * @param float $value
	 * @param int   $tax_class_id
	 *
	 * @return string
	 */
	protected function formatPrice(float $value, int $tax_class_id): string {
		return $this->currency->format($this->tax->calculate($value, $tax_class_id, $this->config->get('config_tax')), $this->session->data['currency']);
	}

	/**
	 * Resized image URL (absolute) or a placeholder.
	 *
	 * @param string $path
	 * @param int    $width
	 * @param int    $height
	 *
	 * @return string
	 */
	protected function image(string $path, int $width = 0, int $height = 0): string {
		$this->load->model('tool/image');

		$width = $width ?: (int)($this->config->get('module_mobile_api_image_width') ?: 500);
		$height = $height ?: (int)($this->config->get('module_mobile_api_image_height') ?: 500);

		if ($path && is_file(DIR_IMAGE . html_entity_decode($path, ENT_QUOTES, 'UTF-8'))) {
			return $this->model_tool_image->resize($path, $width, $height);
		}

		return $this->model_tool_image->resize('placeholder.png', $width, $height);
	}

	/**
	 * Compact product representation used by every product list.
	 *
	 * @param array<string, mixed> $row row from model_catalog_product->getProducts()/getProduct()
	 *
	 * @return array<string, mixed>
	 */
	protected function productCard(array $row): array {
		$show_price = $this->canSeePrice();

		$price_value = (float)(!empty($row['discount']) ? $row['discount'] : $row['price']);
		$special_value = (float)($row['special'] ?? 0);

		$tax_class_id = (int)$row['tax_class_id'];

		$final = $special_value ?: $price_value;

		return [
			'product_id'    => (int)$row['product_id'],
			'name'          => $this->decode((string)$row['name']),
			'model'         => $this->decode((string)($row['model'] ?? '')),
			'thumb'         => $this->image((string)$row['image']),
			'price'         => $show_price ? $this->formatPrice($price_value, $tax_class_id) : '',
			'special'       => ($show_price && $special_value) ? $this->formatPrice($special_value, $tax_class_id) : '',
			'price_value'   => $show_price ? $this->tax->calculate($final, $tax_class_id, $this->config->get('config_tax')) : null,
			'discount_pct'  => ($special_value && $price_value > 0) ? (int)round((1 - $special_value / $price_value) * 100) : 0,
			'rating'        => (float)($row['rating'] ?? 0),
			'reviews'       => (int)($row['reviews'] ?? 0),
			'minimum'       => max(1, (int)($row['minimum'] ?? 1)),
			'in_stock'      => (int)($row['quantity'] ?? 0) > 0
		];
	}

	/**
	 * Validate an address payload (same rules as account/address.save).
	 *
	 * @param array<string, mixed> $data firstname, lastname, company, address_1, address_2, city, postcode, country_id, zone_id
	 *
	 * @return array<string, string> field => error
	 */
	protected function validateAddress(array $data): array {
		$this->load->language('account/address', 'address');

		$data += ['firstname' => '', 'lastname' => '', 'address_1' => '', 'city' => '', 'postcode' => '', 'country_id' => 0, 'zone_id' => 0];

		$errors = [];

		if (!oc_validate_length((string)$data['firstname'], 1, 32)) {
			$errors['firstname'] = $this->t('address_error_firstname');
		}

		if (!oc_validate_length((string)$data['lastname'], 1, 32)) {
			$errors['lastname'] = $this->t('address_error_lastname');
		}

		if (!oc_validate_length((string)$data['address_1'], 3, 128)) {
			$errors['address_1'] = $this->t('address_error_address_1');
		}

		if (!oc_validate_length((string)$data['city'], 2, 128)) {
			$errors['city'] = $this->t('address_error_city');
		}

		$this->load->model('localisation/country');

		$country_info = $this->model_localisation_country->getCountry((int)$data['country_id']);

		if (!$country_info) {
			$errors['country_id'] = $this->t('address_error_country');
		} elseif ($country_info['postcode_required'] && !oc_validate_length((string)$data['postcode'], 2, 10)) {
			$errors['postcode'] = $this->t('address_error_postcode');
		}

		$this->load->model('localisation/zone');

		if ($country_info && $this->model_localisation_zone->getTotalZonesByCountryId((int)$data['country_id']) && !(int)$data['zone_id']) {
			$errors['zone_id'] = $this->t('address_error_zone');
		}

		return $errors;
	}

	/**
	 * Build the address array OpenCart keeps in the session for checkout.
	 *
	 * @param array<string, mixed> $data
	 * @param int                  $address_id
	 *
	 * @return array<string, mixed>
	 */
	protected function buildSessionAddress(array $data, int $address_id = 0): array {
		$this->load->model('localisation/country');
		$this->load->model('localisation/zone');
		$this->load->model('localisation/address_format');

		$country_info = $this->model_localisation_country->getCountry((int)$data['country_id']);
		$zone_info = $this->model_localisation_zone->getZone((int)($data['zone_id'] ?? 0));

		$address_format = '';

		if ($country_info) {
			$address_format_info = $this->model_localisation_address_format->getAddressFormat((int)$country_info['address_format_id']);

			if ($address_format_info) {
				$address_format = $address_format_info['address_format'];
			}
		}

		return [
			'address_id'     => $address_id,
			'firstname'      => (string)$data['firstname'],
			'lastname'       => (string)$data['lastname'],
			'company'        => (string)($data['company'] ?? ''),
			'address_1'      => (string)$data['address_1'],
			'address_2'      => (string)($data['address_2'] ?? ''),
			'postcode'       => (string)($data['postcode'] ?? ''),
			'city'           => (string)$data['city'],
			'zone_id'        => (int)($data['zone_id'] ?? 0),
			'zone'           => $zone_info ? $zone_info['name'] : '',
			'zone_code'      => $zone_info ? $zone_info['code'] : '',
			'country_id'     => (int)$data['country_id'],
			'country'        => $country_info ? $country_info['name'] : '',
			'iso_code_2'     => $country_info ? $country_info['iso_code_2'] : '',
			'iso_code_3'     => $country_info ? $country_info['iso_code_3'] : '',
			'address_format' => $address_format,
			'custom_field'   => (array)($data['custom_field'] ?? [])
		];
	}

	/**
	 * Address for the client.
	 *
	 * @param array<string, mixed> $address
	 *
	 * @return array<string, mixed>
	 */
	protected function addressPayload(array $address): array {
		return [
			'address_id' => (int)($address['address_id'] ?? 0),
			'firstname'  => $this->decode((string)$address['firstname']),
			'lastname'   => $this->decode((string)$address['lastname']),
			'company'    => $this->decode((string)($address['company'] ?? '')),
			'address_1'  => $this->decode((string)$address['address_1']),
			'address_2'  => $this->decode((string)($address['address_2'] ?? '')),
			'city'       => $this->decode((string)$address['city']),
			'postcode'   => $this->decode((string)($address['postcode'] ?? '')),
			'country_id' => (int)$address['country_id'],
			'country'    => $this->decode((string)($address['country'] ?? '')),
			'zone_id'    => (int)$address['zone_id'],
			'zone'       => $this->decode((string)($address['zone'] ?? '')),
			'default'    => !empty($address['default'])
		];
	}

	/**
	 * Translate a language key with HTML entities decoded.
	 *
	 * @param string $key
	 *
	 * @return string
	 */
	protected function t(string $key): string {
		return $this->decode((string)$this->language->get($key));
	}
}
