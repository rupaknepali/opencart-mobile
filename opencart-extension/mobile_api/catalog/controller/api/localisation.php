<?php
namespace Opencart\Catalog\Controller\Extension\MobileApi\Api;
/**
 * Class Localisation
 *
 * GET extension/mobile_api/api/localisation.countries
 * GET extension/mobile_api/api/localisation.zones&country_id=223
 *
 * @package Opencart\Catalog\Controller\Extension\MobileApi\Api
 */
class Localisation extends \Opencart\System\Library\Extension\MobileApi\ApiController {
	/**
	 * @return void
	 */
	public function countries(): void {
		if (!$this->guard()) {
			return;
		}

		$this->load->model('localisation/country');

		$countries = [];

		foreach ($this->model_localisation_country->getCountries() as $country) {
			$countries[] = [
				'country_id'        => (int)$country['country_id'],
				'name'              => $this->decode($country['name']),
				'iso_code_2'        => $country['iso_code_2'],
				'postcode_required' => (bool)$country['postcode_required']
			];
		}

		$this->ok(['countries' => $countries]);
	}

	/**
	 * @return void
	 */
	public function zones(): void {
		if (!$this->guard()) {
			return;
		}

		$this->load->model('localisation/zone');

		$zones = [];

		foreach ($this->model_localisation_zone->getZonesByCountryId((int)$this->query('country_id', 0)) as $zone) {
			$zones[] = [
				'zone_id' => (int)$zone['zone_id'],
				'name'    => $this->decode($zone['name']),
				'code'    => $zone['code']
			];
		}

		$this->ok(['zones' => $zones]);
	}
}
