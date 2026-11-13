#!/bin/sh
# Packages the extension for Extensions > Installer in OpenCart 4.1.0.4.
# The archive name (mobile_api) becomes the extension folder name, so do not rename it.
set -e
cd "$(dirname "$0")/mobile_api"
rm -f ../mobile_api.ocmod.zip
zip -r -X ../mobile_api.ocmod.zip . -x '.*' -x '__MACOSX'
echo "Built $(cd .. && pwd)/mobile_api.ocmod.zip"
