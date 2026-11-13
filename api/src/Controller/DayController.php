<?php

namespace App\Controller;

use App\Dto\DayInput;
use App\Dto\DaysInput;
use App\Dto\RestInput;
use App\Dto\RestsInput;
use App\Enum\Slot;
use App\Repository\CabinetRepository;
use App\Repository\NurseRepository;
use App\Repository\RestRepository;
use App\Repository\WorkDayRepository;
use App\Service\Dates;
use App\Service\PlanningService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;

/** Jours de cabinet et repos voulus. */
#[Route('/api')]
final class DayController extends ApiController
{
    public function __construct(
        private readonly PlanningService $planning,
        private readonly CabinetRepository $cabinets,
        private readonly NurseRepository $nurses,
    ) {
    }

    #[Route('/days', methods: ['POST'])]
    public function add(#[MapRequestPayload] DaysInput $in): JsonResponse
    {
        $user = $this->me();
        $result = $this->planning->addDays(
            $user,
            Dates::parseList($in->dates),
            $this->found($this->cabinets->findOwned($user, $in->cabinetId), 'Cabinet introuvable.'),
            $in->nurseId ? $this->found($this->nurses->findOwned($user, $in->nurseId), 'Infirmière introuvable.') : null,
            Slot::from($in->slot),
        );

        return $this->withPlanning($result, 201);
    }

    #[Route('/days/{id}', methods: ['PUT'])]
    public function update(string $id, #[MapRequestPayload] DayInput $in, WorkDayRepository $days): JsonResponse
    {
        $user = $this->me();
        $result = $this->planning->updateDay(
            $user,
            $this->found($days->findOwned($user, $id), 'Jour introuvable.'),
            $this->found($this->cabinets->findOwned($user, $in->cabinetId), 'Cabinet introuvable.'),
            $in->nurseId ? $this->found($this->nurses->findOwned($user, $in->nurseId), 'Infirmière introuvable.') : null,
            Slot::from($in->slot),
        );

        return $this->withPlanning($result);
    }

    #[Route('/days/{id}', methods: ['DELETE'])]
    public function delete(string $id, WorkDayRepository $days): JsonResponse
    {
        $user = $this->me();

        return $this->withPlanning($this->planning->deleteDay($user, $this->found($days->findOwned($user, $id), 'Jour introuvable.')));
    }

    #[Route('/rests', methods: ['POST'])]
    public function addRests(#[MapRequestPayload] RestsInput $in): JsonResponse
    {
        return $this->withPlanning($this->planning->setRests($this->me(), Dates::parseList($in->dates), Slot::from($in->slot), $in->toggle));
    }

    #[Route('/rests/{date}', methods: ['PUT'], requirements: ['date' => '\d{4}-\d{2}-\d{2}'])]
    public function setRest(string $date, #[MapRequestPayload] RestInput $in): JsonResponse
    {
        return $this->withPlanning($this->planning->setRest($this->me(), Dates::parse($date), Slot::from($in->slot)));
    }

    #[Route('/rests/{date}', methods: ['DELETE'], requirements: ['date' => '\d{4}-\d{2}-\d{2}'])]
    public function deleteRest(string $date, RestRepository $rests): JsonResponse
    {
        $user = $this->me();
        $rest = $this->found($rests->findOnDate($user, Dates::parse($date)), 'Aucun repos ce jour-là.');

        return $this->withPlanning($this->planning->deleteRest($user, $rest));
    }
}
