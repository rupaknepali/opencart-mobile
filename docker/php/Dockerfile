FROM php:8.3-apache
RUN apt-get update \
 && apt-get install -y --no-install-recommends libpng-dev libjpeg62-turbo-dev libfreetype6-dev libwebp-dev libzip-dev libcurl4-openssl-dev \
 && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
 && docker-php-ext-install -j"$(nproc)" gd mysqli zip curl opcache \
 && a2enmod rewrite headers \
 && rm -rf /var/lib/apt/lists/*
RUN { echo 'upload_max_filesize=64M'; echo 'post_max_size=64M'; echo 'memory_limit=256M'; echo 'max_execution_time=300'; } > /usr/local/etc/php/conf.d/opencart.ini
