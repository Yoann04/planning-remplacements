<?php

namespace App\Service;

use App\Entity\PersonalEvent;
use App\Entity\User;
use App\Enum\Slot;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Rendez-vous perso : simple information, jamais bloquante. Ils n'interagissent pas avec les jours
 * de cabinet ni avec les repos (rien n'est retiré ni refusé), et ne comptent dans aucun compteur.
 */
final class EventService
{
    public function __construct(private readonly EntityManagerInterface $em, private readonly UndoService $undo)
    {
    }

    /**
     * @param list<\DateTimeImmutable> $dates
     *
     * @return array{added: int, undoId: ?string}
     */
    public function add(User $user, array $dates, Slot $slot, string $label): array
    {
        $ops = [];
        foreach ($dates as $date) {
            $e = new PersonalEvent($user, $date, $slot, $label);
            $this->em->persist($e);
            $ops[] = UndoService::delete('event', $e->getId());
        }

        return ['added' => \count($ops), 'undoId' => $this->save($user, $ops)];
    }

    /** @return array{undoId: ?string} */
    public function update(User $user, PersonalEvent $event, Slot $slot, string $label): array
    {
        $ops = [UndoService::put($event)];
        $event->update($slot, $label);

        return ['undoId' => $this->save($user, $ops)];
    }

    /** @return array{undoId: ?string} */
    public function delete(User $user, PersonalEvent $event): array
    {
        $ops = [UndoService::put($event)];
        $this->em->remove($event);

        return ['undoId' => $this->save($user, $ops)];
    }

    private function save(User $user, array $ops): ?string
    {
        $id = $this->undo->record($user, $ops);
        $this->em->flush();

        return $id;
    }
}
