<?php

use Symfony\Component\Dotenv\Dotenv;

require dirname(__DIR__).'/vendor/autoload.php';

if (method_exists(Dotenv::class, 'bootEnv')) {
    (new Dotenv())->bootEnv(dirname(__DIR__).'/.env');
}

if ($_SERVER['APP_DEBUG']) {
    umask(0000);
}

// Base SQLite de test recréée à chaque lancement, clés JWT de test générées si absentes (aucun secret réel).
$console = escapeshellarg(dirname(__DIR__).'/bin/console');
foreach (['doctrine:schema:drop --force --full-database', 'doctrine:schema:create', 'lexik:jwt:generate-keypair --skip-if-exists'] as $cmd) {
    exec(sprintf('APP_ENV=test php %s %s --no-interaction -q 2>&1', $console, $cmd), $out, $code);
    if (0 !== $code) {
        fwrite(STDERR, "Échec de « $cmd » :\n".implode("\n", $out)."\n");
        exit(1);
    }
}
