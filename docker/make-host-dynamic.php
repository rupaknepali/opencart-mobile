<?php
/**
 * Makes the dev store's URLs follow the request's Host header, so the same store works at
 * http://localhost:8090/ on this computer and at http://<LAN IP>:8090/ from a phone (links
 * and image URLs then point at an address the client can actually reach).
 *
 * Run from the store root inside the web container (docker/setup-store.sh does this):
 *   php make-host-dynamic.php localhost:8090
 *
 * Development only. A production store should use its fixed public HTTPS URL.
 */
$fallback = $argv[1] ?? 'localhost:8090';

$expression = function (string $path) use ($fallback): string {
	return "'http://' . (isset(\$_SERVER['HTTP_HOST']) ? \$_SERVER['HTTP_HOST'] : '" . $fallback . "') . '" . $path . "'";
};

$files = [
	'config.php'       => ['HTTP_SERVER' => '/'],
	'admin/config.php' => ['HTTP_SERVER' => '/admin/', 'HTTP_CATALOG' => '/'],
];

foreach ($files as $file => $constants) {
	$source = file_get_contents($file);

	foreach ($constants as $name => $path) {
		$source = preg_replace("/define\('" . $name . "', '[^']*'\);/", "define('" . $name . "', " . $expression($path) . ");", $source, 1, $count);

		if ($count !== 1) {
			fwrite(STDERR, "Could not find $name in $file\n");
			exit(1);
		}
	}

	file_put_contents($file, $source);
}

echo "Store URLs now follow the request host (fallback: $fallback)\n";
