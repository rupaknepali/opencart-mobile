<?php
namespace Opencart\Admin\Controller\Extension\MobileApi\Module;
/**
 * Class MobileApi
 *
 * Extensions > Extensions > Modules > Mobile App API
 *
 * @package Opencart\Admin\Controller\Extension\MobileApi\Module
 */
class MobileApi extends \Opencart\System\Engine\Controller {
	/**
	 * Settings form.
	 *
	 * @return void
	 */
	public function index(): void {
		$this->load->language('extension/mobile_api/module/mobile_api');

		$this->document->setTitle($this->language->get('heading_title'));

		$data['breadcrumbs'] = [];

		$data['breadcrumbs'][] = [
			'text' => $this->language->get('text_home'),
			'href' => $this->url->link('common/dashboard', 'user_token=' . $this->session->data['user_token'])
		];

		$data['breadcrumbs'][] = [
			'text' => $this->language->get('text_extension'),
			'href' => $this->url->link('marketplace/extension', 'user_token=' . $this->session->data['user_token'] . '&type=module')
		];

		$data['breadcrumbs'][] = [
			'text' => $this->language->get('heading_title'),
			'href' => $this->url->link('extension/mobile_api/module/mobile_api', 'user_token=' . $this->session->data['user_token'])
		];

		$data['save'] = $this->url->link('extension/mobile_api/module/mobile_api.save', 'user_token=' . $this->session->data['user_token']);
		$data['back'] = $this->url->link('marketplace/extension', 'user_token=' . $this->session->data['user_token'] . '&type=module');

		$data['module_mobile_api_status'] = $this->config->get('module_mobile_api_status');
		$data['module_mobile_api_key'] = $this->config->get('module_mobile_api_key') ?: oc_token(40);
		$data['module_mobile_api_cors'] = $this->config->get('module_mobile_api_cors');
		$data['module_mobile_api_banner_id'] = (int)$this->config->get('module_mobile_api_banner_id');
		$data['module_mobile_api_featured'] = $this->config->get('module_mobile_api_featured');
		$data['module_mobile_api_home_limit'] = $this->config->get('module_mobile_api_home_limit') ?: 10;
		$data['module_mobile_api_image_width'] = $this->config->get('module_mobile_api_image_width') ?: 500;
		$data['module_mobile_api_image_height'] = $this->config->get('module_mobile_api_image_height') ?: 500;

		// App colours. Button colours are optional: empty = follow primary / automatic contrast.
		$data['colors'] = [];

		$primary = $this->config->get('module_mobile_api_color_primary') ?: '#1f6feb';

		$defaults = [
			'primary'     => ['#1f6feb', '#1f6feb'],
			'secondary'   => ['#e5484d', '#e5484d'],
			'tertiary'    => ['#ffffff', '#ffffff'],
			'text'        => ['#1b1f24', '#1b1f24'],
			'button'      => ['', $primary],
			'button_text' => ['', '#ffffff']
		];

		foreach ($defaults as $code => [$default, $swatch]) {
			$value = (string)$this->config->get('module_mobile_api_color_' . $code);

			if ($default !== '' && $value === '') {
				$value = $default;
			}

			$data['colors'][] = [
				'code'        => str_replace('_', '-', $code),
				'name'        => 'module_mobile_api_color_' . $code,
				'label'       => $this->language->get('entry_color_' . $code),
				'help'        => $this->language->get('help_color_' . $code),
				'value'       => $value,
				'swatch'      => $value ?: $swatch,
				'default'     => $default,
				'placeholder' => $default ?: $this->language->get('text_auto')
			];
		}

		$this->load->model('design/banner');

		$data['banners'] = $this->model_design_banner->getBanners();

		$data['api_base'] = HTTP_CATALOG . 'index.php?route=extension/mobile_api/api/';

		$data['header'] = $this->load->controller('common/header');
		$data['column_left'] = $this->load->controller('common/column_left');
		$data['footer'] = $this->load->controller('common/footer');

		$this->response->setOutput($this->load->view('extension/mobile_api/module/mobile_api', $data));
	}

	/**
	 * @return void
	 */
	public function save(): void {
		$this->load->language('extension/mobile_api/module/mobile_api');

		$json = [];

		if (!$this->user->hasPermission('modify', 'extension/mobile_api/module/mobile_api')) {
			$json['error']['warning'] = $this->language->get('error_permission');
		}

		$key = (string)($this->request->post['module_mobile_api_key'] ?? '');

		if (!preg_match('/^[a-zA-Z0-9]{20,64}$/', $key)) {
			$json['error']['key'] = $this->language->get('error_key');
		}

		foreach (['primary', 'secondary', 'tertiary', 'text', 'button', 'button_text'] as $code) {
			$color = trim((string)($this->request->post['module_mobile_api_color_' . $code] ?? ''));

			if ($color !== '' && !preg_match('/^#[0-9a-fA-F]{6}$/', $color)) {
				$json['error']['color_' . $code] = $this->language->get('error_color');
			}
		}

		if (!$json) {
			$this->load->model('setting/setting');

			$post = $this->request->post;

			$post['module_mobile_api_featured'] = implode(',', array_filter(array_map('intval', explode(',', (string)($post['module_mobile_api_featured'] ?? '')))));

			$this->model_setting_setting->editSetting('module_mobile_api', $post);

			$json['success'] = $this->language->get('text_success');
		}

		$this->response->addHeader('Content-Type: application/json');
		$this->response->setOutput(json_encode($json));
	}

	/**
	 * Called by Extensions > Modules > Install.
	 *
	 * @return void
	 */
	public function install(): void {
		if (!$this->user->hasPermission('modify', 'extension/module')) {
			return;
		}

		// Register the session startup on the catalog side
		$this->load->model('setting/startup');

		$this->model_setting_startup->deleteStartupByCode('mobile_api');

		$this->model_setting_startup->addStartup([
			'code'        => 'mobile_api',
			'description' => 'Mobile App API: restores the app session from the X-Session-Token header',
			'action'      => 'catalog/extension/mobile_api/startup/mobile_api',
			'status'      => 1,
			'sort_order'  => 0
		]);

		// Default settings (disabled until the admin saves the form)
		$this->load->model('setting/setting');

		$this->model_setting_setting->editSetting('module_mobile_api', [
			'module_mobile_api_status'       => 0,
			'module_mobile_api_key'          => oc_token(40),
			'module_mobile_api_cors'         => '',
			'module_mobile_api_banner_id'    => 0,
			'module_mobile_api_featured'     => '',
			'module_mobile_api_home_limit'   => 10,
			'module_mobile_api_image_width'  => 500,
			'module_mobile_api_image_height' => 500,
			'module_mobile_api_color_primary'   => '#1f6feb',
			'module_mobile_api_color_secondary' => '#e5484d',
			'module_mobile_api_color_tertiary'  => '#ffffff',
			'module_mobile_api_color_text'      => '#1b1f24',
			'module_mobile_api_color_button'      => '',
			'module_mobile_api_color_button_text' => ''
		]);
	}

	/**
	 * Called by Extensions > Modules > Uninstall.
	 *
	 * @return void
	 */
	public function uninstall(): void {
		if (!$this->user->hasPermission('modify', 'extension/module')) {
			return;
		}

		$this->load->model('setting/startup');

		$this->model_setting_startup->deleteStartupByCode('mobile_api');

		$this->load->model('setting/setting');

		$this->model_setting_setting->deleteSetting('module_mobile_api');
	}
}
