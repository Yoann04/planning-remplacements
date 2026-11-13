# Architecture

Ce document est écrit pour être raconté en entretien : chaque choix a sa raison.

## Vue d'ensemble

```
iPhone (Safari / écran d'accueil)
  └─ Front Angular (PWA)  ──  HTTPS, JSON, en-tête Authorization: Bearer <JWT>  ──▶  API Symfony  ──▶  MySQL / MariaDB
       signaux : état de l'écran + copie du planning                                 règles métier, sécurité,
       règles de calcul pour l'affichage                                              compteurs, annulation
```

Une seule utilisatrice au départ, quelques centaines de jours par an : le volume est minuscule. L'architecture vise
la **simplicité** et la **justesse des règles**, pas la montée en charge.

## API (Symfony 7.4 LTS)

### Couches

| Dossier | Rôle |
|---|---|
| `Entity/` | Modèle Doctrine : `User`, `Cabinet`, `Nurse`, `WorkDay`, `Rest`, `Note`, `SchoolHoliday`, `UndoLog`. Chaque ligne métier a un `owner`. |
| `Enum/` | `Slot` (full / am / pm, avec `value()` = 1 ou 0,5 et `overlaps()`), `NoteScope`, `VacationZone`. |
| `Dto/` | Corps de requête typés et validés (`#[MapRequestPayload]` + contraintes Validator, messages en français). |
| `Controller/` | Fins : lisent l'utilisateur connecté, appellent un service, renvoient du JSON. |
| `Service/` | Les règles : `PlanningService` (jours et repos), `CabinetService`, `NoteService`, `StatsService`, `UndoService`, `PlanningSnapshot`. |
| `Repository/` | Requêtes, toujours filtrées par propriétaire (`findOwned`). |
| `EventSubscriber/ApiExceptionSubscriber` | Toute erreur `/api` devient `{"error": "message en français"}` avec le bon code (422, 404…). |
| `Command/` | `app:user:create` (pas d'inscription publique), `app:holidays:import`. |

### Règles métier (dans `PlanningService`)

- Journée = 1, demi-journée = 0,5. Plusieurs cabinets / infirmières le même jour : autorisé.
- `Slot::overlaps()` : la journée chevauche tout, une demi-journée chevauche la même demi-journée. **Toute la logique repos / cabinet repose sur cette seule fonction.**
- Ajouter un cabinet qui chevauche un repos **retire le repos** (et l'annulation le remet).
- Ajouter un repos sur une période déjà occupée est **refusé** (422, message affiché tel quel).
- Si le cabinet a des infirmières, il faut en choisir une ; elle doit appartenir à ce cabinet.
- Supprimer une infirmière garde ses jours, « sans infirmière indiquée ».

### Annuler (après chaque modification)

Chaque modification enregistre dans `UndoLog` la liste des **opérations inverses** : `delete` (supprimer ce qu'on a créé)
ou `put` (remettre une ligne dans l'état noté). `POST /api/undo/{id}` les rejoue dans une transaction.
Les identifiants sont des **UUID v7 générés par le serveur** : une ligne supprimée revient avec le même identifiant.
Supprimer un cabinet note le cabinet, ses infirmières, ses jours et ses pense-bêtes : l'annulation remet tout à l'identique (testé).

### Réponse des modifications

Chaque modification renvoie son résultat **et le planning complet** (`PlanningSnapshot`). Le front n'a jamais à
deviner l'état du serveur : un seul aller-retour, aucune désynchronisation possible. C'est raisonnable parce que le volume est faible
(environ 250 jours par an) ; avec beaucoup de données on renverrait seulement ce qui a changé.

### Sécurité

- **JWT** (LexikJWTAuthenticationBundle, RS256) : `POST /api/login` renvoie un jeton signé valable 30 jours ; toutes les autres routes `/api` l'exigent (pare-feu sans session).
- **Mots de passe hachés** avec l'algorithme recommandé par PHP (`auto`), re-hachés automatiquement s'il évolue.
- **Limitation des tentatives** : 5 échecs en 15 minutes bloquent la connexion (par e-mail et par IP).
- **Cloisonnement** : toute lecture passe par `findOwned($user, $id)`. Un identifiant d'un autre utilisateur répond 404, comme s'il n'existait pas (testé pour cabinets, jours, pense-bêtes, annulations).
- **Validation côté serveur** de toutes les entrées (dates strictes, couleurs, longueurs, choix), indépendante du front.
- **CORS restreint** à l'origine du front (`CORS_ALLOW_ORIGIN`) ; en production front et API partagent le domaine.
- **Secrets hors de git** : `.env.local` et clés `config/jwt/*.pem` ignorés ; `.env` ne contient que des valeurs d'exemple.

### Base de données

Migration MySQL / MariaDB (`migrations/Version20261113000000.php`). Index `(owner_id, date)` sur les jours, contrainte d'unicité
`(owner_id, date)` sur les repos (un seul repos par jour). Les suppressions en cascade sont faites explicitement dans le code
(en plus des clés étrangères) pour se comporter pareil sur SQLite, utilisé par les tests.

## Front (Angular 22)

### Organisation

| Dossier | Rôle |
|---|---|
| `core/dates.ts`, `holidays.ts`, `rules.ts` | **Fonctions pures** : dates en français, jours fériés (calcul de Pâques), vacances par zone, règles de chevauchement, compteurs. Testées avec Vitest. |
| `core/api.service.ts` | Un appel HTTP par route de l'API. |
| `core/auth.service.ts` + `auth.interceptor.ts` | Jeton JWT (localStorage si « Rester connectée », sinon sessionStorage), ajout de l'en-tête, déconnexion si le jeton est refusé. |
| `core/planning.store.ts` | Le planning en **signaux** + index par date (calculé) ; `run()` applique la réponse et affiche le message avec « Annuler ». |
| `core/ui.state.ts` | L'état de l'écran (onglet, vue, jour courant, sélection, fenêtre ouverte, « Retour »). Aucune donnée métier. |
| `core/actions.ts` | Les actions de l'utilisatrice et **tous les messages en français**, au même endroit. |
| `calendar/`, `activity/`, `sheets/`, `shell/`, `shared/` | Composants d'affichage, `OnPush`, sans logique métier. |

### Choix techniques

- **Signaux sans zone.js** : l'affichage se met à jour exactement quand une donnée change ; pas de magie de détection.
- **Pas de routeur** : l'application est un seul écran avec des vues et des fenêtres, comme le prototype ; « Retour » est géré dans `UiState`.
- **Styles du prototype repris tels quels** (`styles.css`) : le prototype validé fait foi, on n'a pas réinterprété le design. Thème clair / sombre automatique.
- **« Mon activité »** affiche les compteurs calculés par l'API (`/api/stats`, rechargés via `resource()` quand le planning change) ; le calendrier calcule ses petits totaux localement avec les mêmes règles.
- **Glisser pour sélectionner** (mode « Ajouter des jours ») : évènements *pointer* + `setPointerCapture` + `elementFromPoint`, `touch-action: none` sur la grille. **Jamais testé sur un vrai iPhone** : à vérifier à l'étape 4.
- **PWA** : manifeste, icônes, service worker Angular (coquille hors ligne ; les données passent toujours par l'API, `/api` exclu du cache).

## Tests

- API : 29 tests PHPUnit (fonctionnels via HTTP + unitaires), base SQLite recréée à chaque lancement, horloge figée au 15/11/2026 pour tester « faits / prévus ».
- Front : 16 tests Vitest sur les fonctions pures.
