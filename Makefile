# Common tasks. Run `make` or `make help` for the list.
.DEFAULT_GOAL := help
SHELL := /bin/bash

PHP_IMAGE ?= php:8.3-cli

.PHONY: help store up down logs extension php-lint mobile-install mobile-check mobile-start check

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

store: ## First-time setup: download and install OpenCart 4.1.0.4 into ./store
	sh docker/setup-store.sh

up: ## Start the local OpenCart dev store (http://localhost:8090)
	docker compose up -d

down: ## Stop the local dev store (data is kept)
	docker compose down

logs: ## Follow the dev store's Apache/PHP log
	docker compose logs -f web

extension: php-lint ## Lint and package opencart-extension/mobile_api.ocmod.zip
	sh opencart-extension/build.sh

php-lint: ## Syntax-check every extension PHP file (uses Docker, no local PHP needed)
	docker run --rm -v "$(CURDIR)/opencart-extension/mobile_api:/src:ro" $(PHP_IMAGE) \
		sh -c 'status=0; for f in $$(find /src -name "*.php"); do php -l "$$f" >/dev/null || status=1; done; exit $$status'
	@echo "PHP syntax OK"

mobile-install: ## Install the app's dependencies
	cd mobile && npm ci

mobile-check: ## Type-check, lint, format-check and test the app
	cd mobile && npm run check

mobile-start: ## Start Expo (clears the bundler cache)
	cd mobile && npx expo start -c


check: php-lint mobile-check ## Everything CI runs
