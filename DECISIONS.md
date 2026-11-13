# Journal des décisions

Format : date — décision — pourquoi. Les règles fonctionnelles validées sont résumées dans `ARCHITECTURE.md` et visibles dans `prototype/planning-v5.html`.

## 13/11/2026 — démarrage de la production

- **Symfony 7.4 LTS** (et non 8.x, pourtant disponible) : le brief demande 6.4 ou 7.x ; 7.4 est la version à support long, la plus durable dans cette fourchette.
- **Angular 22** (dernière stable), composants autonomes et signaux, sans zone.js (défaut des nouveaux projets).
- **PHP cible 8.4** (`config.platform.php` dans `composer.json`) : certaines dépendances exigent 8.4 ; l'hébergeur devra le proposer (à vérifier chez AlwaysData).
- **Composer lancé via `composer.sh`** : sur ce Mac, Composer plante (segfault) dès qu'il télécharge, parce que la libcurl Homebrew tente HTTP/3 et que la combinaison ngtcp2 + OpenSSL 4.1 plante dans `SSL_set_quic_tls_cbs`. Le script désactive `curl_multi_exec`, ce qui fait passer Composer par les flux PHP (sans HTTP/3). À retirer quand Homebrew aura corrigé curl / ngtcp2.
- **Tests de l'API sur SQLite** (rapides, jetables). Au démarrage, la base de dev était aussi en SQLite car MySQL local ne démarrait plus (`mysqld` cherchait `libprotobuf-lite.35.1.0.dylib`, supprimée par une mise à jour Homebrew de protobuf) : voir la réparation ci-dessous.
- **13/11/2026, réparation de MySQL local** (accord de Yoann) : plutôt que `brew reinstall mysql` (qui aurait installé MySQL 26.10, montée de version majeure du dossier de données partagé avec EcoRide et GameZone), installation de `mysql@9.7` (9.7.4, même série, compilée contre le protobuf actuel) et `brew link` de cette version. Sauvegarde préalable : `/opt/homebrew/var/mysql-sauvegarde-2026-11-13`. MySQL a fait seul la mise à niveau 9.7.1 → 9.7.4 ; EcoRide et GameZone intacts. Base `planning` + utilisateur dédié `planning` (mot de passe dans `api/.env.local`). La base de dev est désormais MySQL ; les tests restent sur SQLite. Pas de démarrage automatique : `mysql.server start` après un redémarrage du Mac.
- **Identifiants UUID v7** générés par le serveur : permettent l'annulation à l'identique et ne révèlent pas le nombre de lignes.
- **Annulation côté serveur** (`UndoLog` + opérations inverses) plutôt qu'un instantané côté front : le serveur reste la seule source de vérité, et l'annulation est testable.
- **Chaque modification renvoie le planning complet** : un seul appel, zéro désynchronisation ; acceptable vu le volume.
- **Doublons exacts ignorés** (même jour, cabinet, infirmière, durée) aussi depuis la fenêtre « Ajouter N jours » (le prototype ne le faisait qu'en mode glisser).
- **Infirmière obligatoire si le cabinet en a** : vérifié côté serveur, comme dans le prototype côté écran.
- **Pense-bêtes** : une seule table `Note` avec une portée (jour, cabinet, infirmière) au lieu de listes dans chaque objet.
- **Vacances scolaires** : table `school_holiday` alimentée par `data/vacances-scolaires.json` (`app:holidays:import`), une mise à jour par an. Jours fériés calculés (Pâques), rien à mettre à jour.
- **Pas de « données d'exemple » ni « Repartir de zéro » dans l'application** : c'était propre au prototype (données locales). Les données de démonstration passent par les fixtures Doctrine (`doctrine:fixtures:load`, compte `demo@planning.test`, mot de passe dans `.env.local`).
- **« Mot de passe oublié ? »** : affiche « Demandez à Yoann de vous créer un nouveau mot de passe » (`app:user:create` change le mot de passe d'un compte existant). Pas d'envoi d'e-mail pour l'instant.
- **Jeton JWT valable 30 jours** : l'application reste ouverte sur le téléphone. « Rester connectée » décoché → jeton oublié à la fermeture.
- **Déploiement visé : front et API sur le même domaine** (build Angular copié dans `api/public`) : pas de CORS en production, un seul HTTPS.
