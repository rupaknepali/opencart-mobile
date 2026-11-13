<?php
namespace Opencart\Catalog\Controller\Extension\MobileApi\Api;
/**
 * Class Address
 *
 * GET  extension/mobile_api/api/address.index
 * POST extension/mobile_api/api/address.save     {address_id?, firstname, lastname, company, address_1, address_2, city, postcode, country_id, zone_id, default}
 * POST extension/mobile_api/api/address.delete   {address_id}
 *
 * @package Opencart\Catalog\Controller\Extension\MobileApi\Api
 */
class Address extends \Opencart\System\Library\Extension\MobileApi\ApiController {
	/**
	 * @return void
	 */
	public function index(): void {
		if (!$this->guardCustomer()) {
			return;
		}

		$this->load->model('account/address');

		$addresses = [];

		foreach ($this->model_account_address->getAddresses($this->customer->getId()) as $address) {
			$addresses[] = $this->addressPayload($address);
		}

		$this->ok(['addresses' => $addresses]);
	}

	/**
	 * Create (no address_id) or update an address.
	 *
	 * @return void
	 */
	public function save(): void {
		if (!$this->guardCustomer()) {
			return;
		}

		$address_id = (int)$this->post('address_id', 0);

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
			'custom_field' => (array)$this->post('custom_field', []),
			'default'      => (bool)$this->post('default', false)
		];

		$errors = $this->validateAddress($data);

		if ($errors) {
			$this->fail(reset($errors), $errors, 422);

			return;
		}

		$this->load->model('account/address');

		if ($address_id) {
			if (!$this->model_account_address->getAddress($this->customer->getId(), $address_id)) {
				$this->fail('Address not found.', [], 404);

				return;
			}

			$this->model_account_address->editAddress($this->customer->getId(), $address_id, $data);
		} else {
			// First address becomes the default automatically
			if (!$this->model_account_address->getTotalAddresses($this->customer->getId())) {
				$data['default'] = true;
			}

			$address_id = $this->model_account_address->addAddress($this->customer->getId(), $data);
		}

		// Keep checkout session addresses in sync if they point at this address
		foreach (['shipping_address', 'payment_address'] as $key) {
			if (isset($this->session->data[$key]['address_id']) && (int)$this->session->data[$key]['address_id'] === $address_id) {
				$this->session->data[$key] = $this->model_account_address->getAddress($this->customer->getId(), $address_id);
			}
		}

		$this->ok(['address' => $this->addressPayload($this->model_account_address->getAddress($this->customer->getId(), $address_id))], 'Address saved.');
	}

	/**
	 * @return void
	 */
	public function delete(): void {
		if (!$this->guardCustomer()) {
			return;
		}

		$this->load->language('account/address');

		$address_id = (int)$this->post('address_id', 0);

		$this->load->model('account/address');

		$address_info = $this->model_account_address->getAddress($this->customer->getId(), $address_id);

		if (!$address_info) {
			$this->fail('Address not found.', [], 404);

			return;
		}

		if ($this->model_account_address->getTotalAddresses($this->customer->getId()) == 1) {
			$this->fail($this->t('error_delete'), [], 422);

			return;
		}

		if (!empty($address_info['default'])) {
			$this->fail($this->t('error_default'), [], 422);

			return;
		}

		$this->model_account_address->deleteAddresses($this->customer->getId(), $address_id);

		foreach (['shipping_address', 'payment_address'] as $key) {
			if (isset($this->session->data[$key]['address_id']) && (int)$this->session->data[$key]['address_id'] === $address_id) {
				unset($this->session->data[$key]);
				unset($this->session->data['shipping_method'], $this->session->data['shipping_methods'], $this->session->data['payment_method'], $this->session->data['payment_methods']);
			}
		}

		$this->ok([], 'Address deleted.');
	}
}
