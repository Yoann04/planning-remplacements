<?php

namespace App\Repository;

use App\Entity\User;
use Symfony\Component\Uid\Uuid;

/**
 * Accès aux lignes d'un utilisateur. Toute lecture passe par le propriétaire :
 * un identifiant appartenant à quelqu'un d'autre se comporte comme un identifiant inexistant.
 */
trait OwnedRepositoryTrait
{
    public function findOwned(User $owner, string $id): ?object
    {
        if (!Uuid::isValid($id)) {
            return null;
        }

        return $this->findOneBy(['id' => Uuid::fromString($id), 'owner' => $owner]);
    }
}
