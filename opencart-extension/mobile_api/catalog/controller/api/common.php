<?php
namespace Opencart\Catalog\Controller\Extension\MobileApi\Api;
/**
 * Class Common
 *
 * GET  extension/mobile_api/api/common.init
 *
 * @package Opencart\Catalog\Controller\Extension\MobileApi\Api
 */
class Common extends \Opencart\System\Library\Extension\MobileApi\ApiController {
	/**
	 * Bootstrap data for the app. Also issues a session token when the app has none.
	 *
	 * @return void
	 */
	public function init(): void {
		if (!$this->guard()) {
			return;
		}

		// Store
		$logo = (string)$this->config->get('config_logo');

		// Currencies
		$this->load->model('localisation/currency');

		$currencies = [];

		foreach ($this->model_localisation_currency->getCurrencies() as $currency) {
			if ($currency['status']) {
				$currencies[] = [
					'code'          => $currency['code'],
					'title'         => $this->decode($currency['title']),
					'symbol_left'   => $currency['symbol_left'],
					'symbol_right'  => $currency['symbol_right']
				];
			}
		}

		// Languages
		$this->load->model('localisation/language');

		$languages = [];

		foreach ($this->model_localisation_language->getLanguages() as $language) {
			if ($language['status']) {
				$languages[] = [
					'code' => $language['code'],
					'name' => $this->decode($language['name'])
				];
			}
		}

		// Terms pages
		$this->load->model('catalog/information');

		$account_terms = $this->model_catalog_information->getInformation((int)$this->config->get('config_account_id'));
		$checkout_terms = $this->model_catalog_information->getInformation((int)$this->config->get('config_checkout_id'));

		// App colours set in the extension settings ('' = use the app default)
		$theme = [];

		foreach (['primary', 'secondary', 'tertiary', 'text', 'button', 'button_text'] as $code) {
			$color = (string)$this->config->get('module_mobile_api_color_' . $code);

			$theme[$code] = preg_match('/^#[0-9a-fA-F]{6}$/', $color) ? strtolower($color) : '';
		}

		$this->ok([
			'session_token' => $this->session->getId(),
			'theme'         => $theme,
			'store'         => [
				'name'      => $this->decode((string)$this->config->get('config_name')),
				'logo'      => ($logo && is_file(DIR_IMAGE . $logo)) ? $this->config->get('config_url') . 'image/' . $logo : '',
				'url'       => $this->config->get('config_url'),
				'email'     => $this->config->get('config_email'),
				'telephone' => $this->config->get('config_telephone'),
				'address'   => $this->decode((string)$this->config->get('config_address')),
				'open'      => $this->decode((string)$this->config->get('config_open'))
			],
			'settings'      => [
				'language'               => $this->config->get('config_language'),
				'currency'               => $this->session->data['currency'],
				'customer_price'         => (bool)$this->config->get('config_customer_price'),
				'guest_checkout'         => (bool)$this->config->get('config_checkout_guest'),
				'checkout_payment_address' => (bool)$this->config->get('config_checkout_payment_address'),
				'review_status'          => (bool)$this->config->get('config_review_status'),
				'review_guest'           => (bool)$this->config->get('config_review_guest'),
				'telephone_required'     => (bool)$this->config->get('config_telephone_required'),
				'password_length'        => (int)$this->config->get('config_password_length') ?: 4,
				'stock_checkout'         => (bool)$this->config->get('config_stock_checkout'),
				'account_terms'          => $account_terms ? ['information_id' => (int)$account_terms['information_id'], 'title' => $this->decode($account_terms['title'])] : null,
				'checkout_terms'         => $checkout_terms ? ['information_id' => (int)$checkout_terms['information_id'], 'title' => $this->decode($checkout_terms['title'])] : null,
				'country_id'             => (int)$this->config->get('config_country_id'),
				'zone_id'                => (int)$this->config->get('config_zone_id')
			],
			'currencies'    => $currencies,
			'languages'     => $languages,
			'customer'      => $this->customer->isLogged() ? [
				'customer_id' => $this->customer->getId(),
				'firstname'   => $this->decode($this->customer->getFirstName()),
				'lastname'    => $this->decode($this->customer->getLastName()),
				'email'       => $this->customer->getEmail(),
				'telephone'   => $this->customer->getTelephone()
			] : null,
			'cart_count'    => $this->cart->countProducts()
		]);
	}
}
