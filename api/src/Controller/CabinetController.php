<?php

namespace App\Controller;

use App\Dto\ActiveInput;
use App\Dto\CabinetInput;
use App\Repository\CabinetRepository;
use App\Service\CabinetService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/cabinets')]
final class CabinetController extends ApiController
{
    public function __construct(private readonly CabinetService $service, private readonly CabinetRepository $cabinets)
    {
    }

    #[Route('', methods: ['POST'])]
    public function create(#[MapRequestPayload] CabinetInput $in): JsonResponse
    {
        $cabinet = $this->service->save($this->me(), null, $in->toArray());

        return $this->withPlanning(['cabinetId' => $cabinet->getId()->toRfc4122()], 201);
    }

    #[Route('/{id}', methods: ['PUT'])]
    public function update(string $id, #[MapRequestPayload] CabinetInput $in): JsonResponse
    {
        $user = $this->me();
        $cabinet = $this->service->save($user, $this->found($this->cabinets->findOwned($user, $id), 'Cabinet introuvable.'), $in->toArray());

        return $this->withPlanning(['cabinetId' => $cabinet->getId()->toRfc4122()]);
    }

    /** Mettre en veille (remplacement terminé) ou réactiver. */
    #[Route('/{id}/active', methods: ['PUT'])]
    public function setActive(string $id, #[MapRequestPayload] ActiveInput $in): JsonResponse
    {
        $user = $this->me();

        return $this->withPlanning($this->service->setActive($user, $this->found($this->cabinets->findOwned($user, $id), 'Cabinet introuvable.'), $in->active));
    }

    #[Route('/{id}', methods: ['DELETE'])]
    public function delete(string $id): JsonResponse
    {
        $user = $this->me();

        return $this->withPlanning($this->service->delete($user, $this->found($this->cabinets->findOwned($user, $id), 'Cabinet introuvable.')));
    }
}
