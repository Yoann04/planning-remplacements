<?php

namespace App\Controller;

use App\Entity\User;
use App\Service\PlanningSnapshot;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Contracts\Service\Attribute\Required;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/** Base commune : utilisateur connecté et réponse « planning à jour + résultat de l'action ». */
abstract class ApiController extends AbstractController
{
    private PlanningSnapshot $snapshot;

    #[Required]
    public function setSnapshot(PlanningSnapshot $snapshot): void
    {
        $this->snapshot = $snapshot;
    }

    protected function me(): User
    {
        $user = $this->getUser();
        \assert($user instanceof User); // garanti par le pare-feu (^/api réservé aux utilisateurs connectés)

        return $user;
    }

    /** Renvoie le résultat de l'action et le planning complet, pour que le front reste synchronisé en un seul appel. */
    protected function withPlanning(array $result = [], int $status = 200): JsonResponse
    {
        return $this->json($result + ['planning' => $this->snapshot->of($this->me())], $status);
    }

    /**
     * @template T of object
     *
     * @param T|null $entity
     *
     * @return T
     */
    protected function found(?object $entity, string $message = 'Élément introuvable.'): object
    {
        return $entity ?? throw new NotFoundHttpException($message);
    }
}
