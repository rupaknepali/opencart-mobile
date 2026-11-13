<?php
namespace Opencart\Catalog\Controller\Extension\MobileApi\Api;
/**
 * Class Catalog
 *
 * GET extension/mobile_api/api/catalog.home
 * GET extension/mobile_api/api/catalog.categories&parent_id=0
 * GET extension/mobile_api/api/catalog.category&category_id=20
 * GET extension/mobile_api/api/catalog.manufacturers
 * GET extension/mobile_api/api/catalog.informations
 * GET extension/mobile_api/api/catalog.information&information_id=4
 *
 * @package Opencart\Catalog\Controller\Extension\MobileApi\Api
 */
class Catalog extends \Opencart\System\Library\Extension\MobileApi\ApiController {
	/**
	 * Home screen: banners, top categories, featured, latest, specials and bestsellers.
	 *
	 * @return void
	 */
	public function home(): void {
		if (!$this->guard()) {
			return;
		}

		$this->load->model('catalog/product');

		$limit = (int)($this->config->get('module_mobile_api_home_limit') ?: 10);

		// Banners
		$banners = [];

		$banner_id = (int)$this->config->get('module_mobile_api_banner_id');

		if ($banner_id) {
			$this->load->model('design/banner');

			foreach ($this->model_design_banner->getBanner($banner_id) as $banner) {
				if ($banner['image'] && is_file(DIR_IMAGE . html_entity_decode($banner['image'], ENT_QUOTES, 'UTF-8'))) {
					$banners[] = [
						'title' => $this->decode($banner['title']),
						'link'  => $this->decode($banner['link']),
						'image' => $this->image($banner['image'], 1140, 480)
					];
				}
			}
		}

		// Featured (product ids configured in the extension settings)
		$featured = [];

		$ids = array_filter(array_map('intval', explode(',', (string)$this->config->get('module_mobile_api_featured'))));

		foreach (array_slice($ids, 0, $limit) as $product_id) {
			$product_info = $this->model_catalog_product->getProduct($product_id);

			if ($product_info) {
				$featured[] = $this->productCard($product_info);
			}
		}

		// Latest
		$latest = [];

		foreach ($this->model_catalog_product->getProducts(['sort' => 'p.date_added', 'order' => 'DESC', 'start' => 0, 'limit' => $limit]) as $row) {
			$latest[] = $this->productCard($row);
		}

		// Specials (re-read through getProduct() so percentage/fixed specials are resolved)
		$specials = [];

		foreach ($this->model_catalog_product->getSpecials(['start' => 0, 'limit' => $limit]) as $row) {
			$product_info = $this->model_catalog_product->getProduct((int)$row['product_id']);

			if ($product_info) {
				$specials[] = $this->productCard($product_info);
			}
		}

		// Bestsellers (core "opencart" extension model). The oc_product_bestseller
		// table only exists once the Bestseller module has been installed.
		$bestsellers = [];

		if (is_file(DIR_EXTENSION . 'opencart/catalog/model/module/bestseller.php') && $this->db->query("SHOW TABLES LIKE '" . $this->db->escape(DB_PREFIX . 'product_bestseller') . "'")->num_rows) {
			$this->load->model('extension/opencart/module/bestseller');

			foreach ($this->model_extension_opencart_module_bestseller->getBestSellers($limit) as $row) {
				$bestsellers[] = $this->productCard($row);
			}
		}

		$this->ok([
			'banners'     => $banners,
			'categories'  => $this->getCategoryList(0, true) ?: $this->getCategoryList(0, false),
			'featured'    => $featured,
			'latest'      => $latest,
			'specials'    => $specials,
			'bestsellers' => $bestsellers
		]);
	}

	/**
	 * Category tree level. parent_id=0 returns top level categories with their children.
	 *
	 * @return void
	 */
	public function categories(): void {
		if (!$this->guard()) {
			return;
		}

		$this->ok(['categories' => $this->getCategoryList((int)$this->query('parent_id', 0), false)]);
	}

	/**
	 * Single category with subcategories and filter groups.
	 *
	 * @return void
	 */
	public function category(): void {
		if (!$this->guard()) {
			return;
		}

		$category_id = (int)$this->query('category_id', 0);

		$this->load->model('catalog/category');

		$category_info = $this->model_catalog_category->getCategory($category_id);

		if (!$category_info) {
			$this->fail('Category not found.', [], 404);

			return;
		}

		$filter_groups = [];

		foreach ($this->model_catalog_category->getFilters($category_id) as $group) {
			$filters = [];

			foreach ($group['filter'] as $filter) {
				$filters[] = [
					'filter_id' => (int)$filter['filter_id'],
					'name'      => $this->decode($filter['name'])
				];
			}

			$filter_groups[] = [
				'filter_group_id' => (int)$group['filter_group_id'],
				'name'            => $this->decode($group['name']),
				'filters'         => $filters
			];
		}

		$this->ok([
			'category' => [
				'category_id' => (int)$category_info['category_id'],
				'name'        => $this->decode($category_info['name']),
				'description' => $this->decode((string)$category_info['description']),
				'image'       => $category_info['image'] ? $this->image($category_info['image'], 600, 300) : ''
			],
			'children'      => $this->getCategoryList($category_id, false),
			'filter_groups' => $filter_groups
		]);
	}

	/**
	 * @return void
	 */
	public function manufacturers(): void {
		if (!$this->guard()) {
			return;
		}

		$this->load->model('catalog/manufacturer');

		$manufacturers = [];

		foreach ($this->model_catalog_manufacturer->getManufacturers() as $manufacturer) {
			$manufacturers[] = [
				'manufacturer_id' => (int)$manufacturer['manufacturer_id'],
				'name'            => $this->decode($manufacturer['name']),
				'image'           => $manufacturer['image'] ? $this->image($manufacturer['image'], 200, 200) : ''
			];
		}

		$this->ok(['manufacturers' => $manufacturers]);
	}

	/**
	 * @return void
	 */
	public function informations(): void {
		if (!$this->guard()) {
			return;
		}

		$this->load->model('catalog/information');

		$informations = [];

		foreach ($this->model_catalog_information->getInformations() as $information) {
			$informations[] = [
				'information_id' => (int)$information['information_id'],
				'title'          => $this->decode($information['title'])
			];
		}

		$this->ok(['informations' => $informations]);
	}

	/**
	 * @return void
	 */
	public function information(): void {
		if (!$this->guard()) {
			return;
		}

		$this->load->model('catalog/information');

		$information_info = $this->model_catalog_information->getInformation((int)$this->query('information_id', 0));

		if (!$information_info) {
			$this->fail('Page not found.', [], 404);

			return;
		}

		$this->ok([
			'information_id' => (int)$information_info['information_id'],
			'title'          => $this->decode($information_info['title']),
			'description'    => $this->decode($information_info['description'])
		]);
	}

	/**
	 * @param int  $parent_id
	 * @param bool $top_only only categories flagged "top" when listing the root
	 *
	 * @return array<int, array<string, mixed>>
	 */
	private function getCategoryList(int $parent_id, bool $top_only): array {
		$this->load->model('catalog/category');
		$this->load->model('catalog/product');

		$data = [];

		foreach ($this->model_catalog_category->getCategories($parent_id) as $category) {
			// 4.1.0.4 dropped the category "top" flag; older versions still have it
			if ($top_only && isset($category['top']) && !$category['top']) {
				continue;
			}

			$children = [];

			foreach ($this->model_catalog_category->getCategories((int)$category['category_id']) as $child) {
				$children[] = [
					'category_id' => (int)$child['category_id'],
					'name'        => $this->decode($child['name']),
					'image'       => $child['image'] ? $this->image($child['image'], 200, 200) : ''
				];
			}

			$data[] = [
				'category_id' => (int)$category['category_id'],
				'name'        => $this->decode($category['name']),
				'image'       => $category['image'] ? $this->image($category['image'], 200, 200) : '',
				'total'       => $this->config->get('config_product_count') ? $this->model_catalog_product->getTotalProducts(['filter_category_id' => (int)$category['category_id'], 'filter_sub_category' => true]) : null,
				'children'    => $children
			];
		}

		return $data;
	}
}
