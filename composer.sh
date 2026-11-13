#!/bin/sh
# Contournement : libcurl Homebrew (HTTP/3 via ngtcp2 + OpenSSL 4.1) fait planter Composer (segfault).
# Désactiver curl_multi_exec force Composer à utiliser les flux PHP, sans HTTP/3.
exec php -d disable_functions=curl_multi_exec -d memory_limit=-1 "$(readlink -f "$(command -v composer)")" "$@"
