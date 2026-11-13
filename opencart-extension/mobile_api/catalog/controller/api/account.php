<?php
namespace Opencart\Catalog\Controller\Extension\MobileApi\Api;
/**
 * Class Account
 *
 * POST extension/mobile_api/api/account.login       {email, password}
 * POST extension/mobile_api/api/account.logout
 * POST extension/mobile_api/api/account.register    {firstname, lastname, email, telephone, password, newsletter, agree, customer_group_id?, custom_field?}
 * POST extension/mobile_api/api/account.forgotten   {email}
 * GET  extension/mobile_api/api/account.profile
 * POST extension/mobile_api/api/account.edit        {firstname, lastname, email, telephone}
 * POST extension/mobile_api/api/account.password    {current, password, confirm}
 * POST extension/mobile_api/api/account.newsletter  {newsletter: 0|1}
 *
 * Validation mirrors catalog/controller/account/*.php in OpenCart 4.1.0.4,
 * minus the browser-only form tokens.
 *
 * @package Opencart\Catalog\Controller\Extension\MobileApi\Api
 */
class Account extends \Opencart\System\Library\Extension\MobileApi\ApiController {
	/**
	 * @return void
	 */
	public function login(): void {
		if (!$this->guard()) {
			return;
		}

		$this->load->language('account/login');

		$email = (string)$this->post('email', '');
		$password = html_entity_decode((string)$this->post('password', ''), ENT_QUOTES, 'UTF-8');

		$this->customer->logout();

		if ($this->config->get('config_2fa')) {
			$this->fail('Two-factor authentication is enabled on this store. Please disable it for mobile app logins.', [], 403);

			return;
		}

		$this->load->model('account/customer');

		$login_info = $this->model_account_customer->getLoginAttempts($email);

		if ($login_info && ($login_info['total'] >= $this->config->get('config_login_attempts')) && strtotime('-1 hour') < strtotime($login_info['date_modified'])) {
			$this->fail($this->t('error_attempts'), [], 429);

			return;
		}

		$customer_info = $this->model_account_customer->getCustomerByEmail($email);

		if ($customer_info && !$customer_info['status']) {
			$this->fail($this->t('error_approved'), [], 403);

			return;
		}

		if (!$this->customer->login($email, $password)) {
			$this->model_account_customer->addLoginAttempt($email);

			$this->fail($this->t('error_login'), [], 401);

			return;
		}

		$this->startCustomerSession($customer_info);

		$this->model_account_customer->deleteLoginAttempts($email);

		$this->ok(['customer' => $this->customerPayload()]);
	}

	/**
	 * @return void
	 */
	public function logout(): void {
		if (!$this->guard()) {
			return;
		}

		$this->customer->logout();

		// Same keys catalog/controller/account/logout.php removes
		foreach (['customer', 'shipping_address', 'shipping_method', 'shipping_methods', 'payment_address', 'payment_method', 'payment_methods', 'comment', 'order_id', 'coupon', 'reward', 'wishlist', 'customer_token'] as $key) {
			unset($this->session->data[$key]);
		}

		$this->ok([], 'You have been logged out.');
	}

	/**
	 * @return void
	 */
	public function register(): void {
		if (!$this->guard()) {
			return;
		}

		$this->load->language('account/register');

		$post_info = $this->request->post + [
			'customer_group_id' => 0,
			'firstname'         => '',
			'lastname'          => '',
			'email'             => '',
			'telephone'         => '',
			'custom_field'      => [],
			'password'          => '',
			'newsletter'        => 0,
			'agree'             => 0
		];

		$errors = [];

		// Customer Group
		$customer_group_id = (int)$post_info['customer_group_id'] ?: (int)$this->config->get('config_customer_group_id');

		$this->load->model('account/customer_group');

		$customer_group_info = $this->model_account_customer_group->getCustomerGroup($customer_group_id);

		if (!$customer_group_info || !in_array($customer_group_id, (array)$this->config->get('config_customer_group_display'))) {
			// Fall back to the default group rather than failing on a hidden group id
			$customer_group_id = (int)$this->config->get('config_customer_group_id');
			$customer_group_info = $this->model_account_customer_group->getCustomerGroup($customer_group_id);
		}

		if (!oc_validate_length((string)$post_info['firstname'], 1, 32)) {
			$errors['firstname'] = $this->t('error_firstname');
		}

		if (!oc_validate_length((string)$post_info['lastname'], 1, 32)) {
			$errors['lastname'] = $this->t('error_lastname');
		}

		if (!oc_validate_email((string)$post_info['email'])) {
			$errors['email'] = $this->t('error_email');
		}

		$this->load->model('account/customer');

		if (!isset($errors['email']) && $this->model_account_customer->getTotalCustomersByEmail((string)$post_info['email'])) {
			$errors['email'] = $this->t('error_exists');
		}

		if ($this->config->get('config_telephone_required') && !oc_validate_length((string)$post_info['telephone'], 3, 32)) {
			$errors['telephone'] = $this->t('error_telephone');
		}

		// Custom fields
		$this->load->model('account/custom_field');

		foreach ($this->model_account_custom_field->getCustomFields($customer_group_id) as $custom_field) {
			if ($custom_field['location'] == 'account' && $custom_field['required'] && empty($post_info['custom_field'][$custom_field['custom_field_id']])) {
				$errors['custom_field_' . $custom_field['custom_field_id']] = sprintf($this->t('error_custom_field'), $custom_field['name']);
			}
		}

		$password_error = $this->validatePassword(html_entity_decode((string)$post_info['password'], ENT_QUOTES, 'UTF-8'));

		if ($password_error) {
			$errors['password'] = $password_error;
		}

		// Terms
		$this->load->model('catalog/information');

		$information_info = $this->model_catalog_information->getInformation((int)$this->config->get('config_account_id'));

		if ($information_info && !$post_info['agree']) {
			$errors['agree'] = sprintf($this->t('error_agree'), $this->decode($information_info['title']));
		}

		if ($errors) {
			$this->fail(reset($errors), $errors, 422);

			return;
		}

		$customer_id = $this->model_account_customer->addCustomer([
			'customer_group_id' => $customer_group_id,
			'firstname'         => $post_info['firstname'],
			'lastname'          => $post_info['lastname'],
			'email'             => $post_info['email'],
			'telephone'         => $post_info['telephone'],
			'custom_field'      => (array)$post_info['custom_field'],
			'password'          => $post_info['password'],
			'newsletter'        => (int)$post_info['newsletter']
		]);

		$this->model_account_customer->deleteLoginAttempts((string)$post_info['email']);

		if ($customer_group_info && $customer_group_info['approval']) {
			$this->ok(['customer' => null, 'approval' => true], 'Your account has been created and is awaiting approval.');

			return;
		}

		$this->customer->login((string)$post_info['email'], html_entity_decode((string)$post_info['password'], ENT_QUOTES, 'UTF-8'));

		$customer_info = $this->model_account_customer->getCustomer($customer_id);

		$this->startCustomerSession($customer_info);

		unset($this->session->data['guest']);

		$this->ok(['customer' => $this->customerPayload(), 'approval' => false], 'Your account has been created.');
	}

	/**
	 * Sends the core "reset password" email (the token is mailed by the core addToken event).
	 *
	 * @return void
	 */
	public function forgotten(): void {
		if (!$this->guard()) {
			return;
		}

		$this->load->language('account/forgotten');

		$email = (string)$this->post('email', '');

		if (!oc_validate_email($email)) {
			$this->fail($this->t('error_email'), ['email' => $this->t('error_email')], 422);

			return;
		}

		$this->load->model('account/customer');

		$customer_info = $this->model_account_customer->getCustomerByEmail($email);

		if ($customer_info) {
			$this->model_account_customer->addToken((int)$customer_info['customer_id'], 'password', oc_token(40));
		}

		// Same message either way so the endpoint cannot be used to probe for accounts.
		$this->ok([], 'If an account exists for that email, a reset link has been sent.');
	}

	/**
	 * @return void
	 */
	public function profile(): void {
		if (!$this->guardCustomer()) {
			return;
		}

		$this->ok(['customer' => $this->customerPayload()]);
	}

	/**
	 * @return void
	 */
	public function edit(): void {
		if (!$this->guardCustomer()) {
			return;
		}

		$this->load->language('account/edit');

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

		$this->load->model('account/customer');

		if (!isset($errors['email']) && oc_strtolower($this->customer->getEmail()) != oc_strtolower((string)$post_info['email']) && $this->model_account_customer->getTotalCustomersByEmail((string)$post_info['email'])) {
			$errors['email'] = $this->t('error_exists');
		}

		if ($this->config->get('config_telephone_required') && !oc_validate_length((string)$post_info['telephone'], 3, 32)) {
			$errors['telephone'] = $this->t('error_telephone');
		}

		if ($errors) {
			$this->fail(reset($errors), $errors, 422);

			return;
		}

		$customer_info = $this->model_account_customer->getCustomer($this->customer->getId());

		$this->model_account_customer->editCustomer($this->customer->getId(), [
			'firstname'    => $post_info['firstname'],
			'lastname'     => $post_info['lastname'],
			'email'        => $post_info['email'],
			'telephone'    => $post_info['telephone'],
			'custom_field' => $customer_info['custom_field'] ? json_decode($customer_info['custom_field'], true) : []
		]);

		// Reload so the customer object and session reflect the change
		$this->customer->login((string)$post_info['email'], '', true);

		$this->startCustomerSession($this->model_account_customer->getCustomer($this->customer->getId()));

		$this->ok(['customer' => $this->customerPayload()], $this->t('text_success'));
	}

	/**
	 * @return void
	 */
	public function password(): void {
		if (!$this->guardCustomer()) {
			return;
		}

		$this->load->language('account/password');

		$current = html_entity_decode((string)$this->post('current', ''), ENT_QUOTES, 'UTF-8');
		$password = html_entity_decode((string)$this->post('password', ''), ENT_QUOTES, 'UTF-8');
		$confirm = html_entity_decode((string)$this->post('confirm', ''), ENT_QUOTES, 'UTF-8');

		$errors = [];

		$this->load->model('account/customer');

		$customer_info = $this->model_account_customer->getCustomer($this->customer->getId());

		if (!$customer_info || !password_verify($current, $customer_info['password'])) {
			$errors['current'] = 'Your current password is incorrect.';
		}

		$password_error = $this->validatePassword($password);

		if ($password_error) {
			$errors['password'] = $password_error;
		}

		if ($password !== $confirm) {
			$errors['confirm'] = $this->t('error_confirm');
		}

		if ($errors) {
			$this->fail(reset($errors), $errors, 422);

			return;
		}

		$this->model_account_customer->editPassword($this->customer->getEmail(), (string)$this->post('password'));

		$this->ok([], $this->t('text_success'));
	}

	/**
	 * @return void
	 */
	public function newsletter(): void {
		if (!$this->guardCustomer()) {
			return;
		}

		$this->load->model('account/customer');

		$this->model_account_customer->editNewsletter($this->customer->getId(), (bool)$this->post('newsletter', 0));

		$this->ok(['newsletter' => (bool)$this->post('newsletter', 0)], 'Newsletter subscription updated.');
	}

	/**
	 * Populate the session the same way account/login.login does.
	 *
	 * @param array<string, mixed> $customer_info
	 *
	 * @return void
	 */
	private function startCustomerSession(array $customer_info): void {
		$this->session->data['customer'] = [
			'customer_id'       => (int)$customer_info['customer_id'],
			'customer_group_id' => (int)$customer_info['customer_group_id'],
			'firstname'         => $customer_info['firstname'],
			'lastname'          => $customer_info['lastname'],
			'email'             => $customer_info['email'],
			'telephone'         => $customer_info['telephone'],
			'custom_field'      => is_string($customer_info['custom_field']) ? (json_decode($customer_info['custom_field'], true) ?: []) : (array)$customer_info['custom_field']
		];

		unset($this->session->data['order_id']);
		unset($this->session->data['guest']);
		unset($this->session->data['shipping_method']);
		unset($this->session->data['shipping_methods']);
		unset($this->session->data['payment_method']);
		unset($this->session->data['payment_methods']);

		// Move guest wishlist into the account
		if (isset($this->session->data['wishlist']) && is_array($this->session->data['wishlist'])) {
			$this->load->model('account/wishlist');

			foreach ($this->session->data['wishlist'] as $key => $product_id) {
				$this->model_account_wishlist->addWishlist($this->customer->getId(), (int)$product_id);

				unset($this->session->data['wishlist'][$key]);
			}
		}

		$this->load->model('account/customer');

		$this->model_account_customer->addLogin($this->customer->getId(), oc_get_ip());

		$this->session->data['customer_token'] = oc_token(26);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function customerPayload(): array {
		return [
			'customer_id' => $this->customer->getId(),
			'firstname'   => $this->decode($this->customer->getFirstName()),
			'lastname'    => $this->decode($this->customer->getLastName()),
			'email'       => $this->customer->getEmail(),
			'telephone'   => $this->customer->getTelephone(),
			'newsletter'  => $this->customer->getNewsletter(),
			'balance'     => $this->currency->format($this->customer->getBalance(), $this->session->data['currency']),
			'reward'      => (int)$this->customer->getRewardPoints()
		];
	}

	/**
	 * Password rules configured under System > Settings > Option.
	 *
	 * @param string $password
	 *
	 * @return string error message or empty string
	 */
	private function validatePassword(string $password): string {
		$this->load->language('account/register', 'register');

		$length = (int)$this->config->get('config_password_length') ?: 4;

		if (!oc_validate_length($password, $length, 40)) {
			return sprintf($this->decode((string)$this->language->get('register_error_password_length')), $length);
		}

		$required = [];

		if ($this->config->get('config_password_uppercase') && !preg_match('/[A-Z]/', $password)) {
			$required[] = $this->language->get('register_error_password_uppercase');
		}

		if ($this->config->get('config_password_lowercase') && !preg_match('/[a-z]/', $password)) {
			$required[] = $this->language->get('register_error_password_lowercase');
		}

		if ($this->config->get('config_password_number') && !preg_match('/[0-9]/', $password)) {
			$required[] = $this->language->get('register_error_password_number');
		}

		if ($this->config->get('config_password_symbol') && !preg_match('/[^a-zA-Z0-9]/', $password)) {
			$required[] = $this->language->get('register_error_password_symbol');
		}

		if ($required) {
			return sprintf($this->decode((string)$this->language->get('register_error_password')), implode(', ', $required), $length);
		}

		return '';
	}
}
