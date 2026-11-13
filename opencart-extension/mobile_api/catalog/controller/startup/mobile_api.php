<?php
namespace Opencart\Catalog\Controller\Extension\MobileApi\Startup;
/**
 * Class MobileApi
 *
 * Registered as a catalog startup action on install. Runs on every storefront
 * request, but only acts on routes that belong to this extension.
 *
 * Native apps do not share the browser's OCSESSID cookie, so the app sends its
 * session id in the "X-Session-Token" header instead. OpenCart has already
 * started a fresh session by the time startups run, so we re-open the session
 * the app asked for and rebuild the objects that depend on it (customer,
 * currency, tax and cart) in the same order the core startups use.
 *
 * @package Opencart\Catalog\Controller\Extension\MobileApi\Startup
 */
class MobileApi extends \Opencart\System\Engine\Controller {
	/**
	 * @return void
	 */
	public function index(): void {
		$route = strtolower((string)($this->request->get['route'] ?? ''));

		if (!str_starts_with($route, 'extension/mobile_api/api/')) {
			return;
		}

		if (!$this->config->get('module_mobile_api_status')) {
			return;
		}

		// CORS (only needed for Expo web / browser testing; native apps ignore it)
		$origin = (string)$this->config->get('module_mobile_api_cors');

		if ($origin !== '') {
			header('Access-Control-Allow-Origin: ' . $origin);
			header('Access-Control-Allow-Headers: Content-Type, X-Api-Key, X-Session-Token');
			header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
			header('Access-Control-Expose-Headers: X-Session-Token');
			header('Vary: Origin');
		}

		if (($this->request->server['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
			http_response_code(204);
			exit();
		}

		// The payment web view cannot send headers, so it passes the token in the query string.
		if ($route === 'extension/mobile_api/api/checkout.pay' && !empty($this->request->get['session_token'])) {
			$token = (string)$this->request->get['session_token'];
		} else {
			$token = (string)($this->request->server['HTTP_X_SESSION_TOKEN'] ?? '');
		}

		$switched = false;

		if ($token !== '' && preg_match('/^[a-zA-Z0-9]{26,52}$/', $token) && $token !== $this->session->getId()) {
			$this->session->start($token);

			$switched = true;
		}

		// Optional currency switch: ?currency=EUR
		if (!empty($this->request->get['currency'])) {
			$this->load->model('localisation/currency');

			$code = strtoupper((string)$this->request->get['currency']);

			if (array_key_exists($code, $this->model_localisation_currency->getCurrencies())) {
				$this->session->data['currency'] = $code;

				$switched = true;
			}
		}

		if ($switched) {
			// Same order as system/config/catalog.php
			$this->load->controller('startup/customer');
			$this->load->controller('startup/currency');
			$this->load->controller('startup/tax');

			$this->registry->set('cart', new \Opencart\System\Library\Cart\Cart($this->registry));
		}
	}
}
