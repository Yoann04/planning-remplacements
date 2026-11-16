<?php

namespace App\Controller;

use App\Dto\EventInput;
use App\Dto\EventsInput;
use App\Enum\Slot;
use App\Repository\PersonalEventRepository;
use App\Service\Dates;
use App\Service\EventService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;

/** Rendez-vous perso. */
#[Route('/api/events')]
final class EventController extends ApiController
{
    public function __construct(private readonly EventService $service, private readonly PersonalEventRepository $events)
    {
    }

    #[Route('', methods: ['POST'])]
    public function add(#[MapRequestPayload] EventsInput $in): JsonResponse
    {
        return $this->withPlanning($this->service->add($this->me(), Dates::parseList($in->dates), Slot::from($in->slot), $in->label), 201);
    }

    #[Route('/{id}', methods: ['PUT'])]
    public function update(string $id, #[MapRequestPayload] EventInput $in): JsonResponse
    {
        $user = $this->me();

        return $this->withPlanning($this->service->update($user, $this->found($this->events->findOwned($user, $id), 'Rendez-vous introuvable.'), Slot::from($in->slot), $in->label));
    }

    #[Route('/{id}', methods: ['DELETE'])]
    public function delete(string $id): JsonResponse
    {
        $user = $this->me();

        return $this->withPlanning($this->service->delete($user, $this->found($this->events->findOwned($user, $id), 'Rendez-vous introuvable.')));
    }
}
