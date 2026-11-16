<?php

namespace App\Service;

use App\Entity\User;
use App\Repository\CabinetRepository;
use App\Repository\NoteRepository;
use App\Repository\PersonalEventRepository;
use App\Repository\NurseRepository;
use App\Repository\RestRepository;
use App\Repository\WorkDayRepository;

/**
 * Tout le planning d'un utilisateur, renvoyé au front après chaque modification.
 * Volume faible (une personne, ~250 jours par an) : un seul aller-retour garde le front toujours à jour.
 */
final readonly class PlanningSnapshot
{
    public function __construct(
        private CabinetRepository $cabinets,
        private NurseRepository $nurses,
        private WorkDayRepository $days,
        private RestRepository $rests,
        private NoteRepository $notes,
        private PersonalEventRepository $events,
    ) {
    }

    public function of(User $user): array
    {
        $rows = static fn (array $entities): array => array_map(static fn ($e) => $e->toArray(), $entities);

        return [
            'user' => ['email' => $user->getEmail(), 'zone' => $user->getVacationZone()->value],
            'cabinets' => $rows($this->cabinets->findAllFor($user)),
            'nurses' => $rows($this->nurses->findAllFor($user)),
            'days' => $rows($this->days->findAllFor($user)),
            'rests' => $rows($this->rests->findAllFor($user)),
            'notes' => $rows($this->notes->findAllFor($user)),
            'events' => $rows($this->events->findAllFor($user)),
        ];
    }
}
