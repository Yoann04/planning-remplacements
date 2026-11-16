<?php

namespace App\Service;

use App\Entity\Cabinet;
use App\Entity\Note;
use App\Entity\Nurse;
use App\Entity\Rest;
use App\Entity\UndoLog;
use App\Entity\User;
use App\Entity\WorkDay;
use App\Enum\NoteScope;
use App\Enum\Slot;
use App\Repository\CabinetRepository;
use App\Repository\NoteRepository;
use App\Repository\NurseRepository;
use App\Repository\RestRepository;
use App\Repository\UndoLogRepository;
use App\Repository\WorkDayRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Uid\Uuid;

/**
 * Bouton « Annuler » : chaque modification enregistre la liste des opérations qui la défont.
 *
 * Deux opérations suffisent :
 *  - ['op' => 'delete', 'type' => …, 'id' => …]  supprime une ligne créée par la modification ;
 *  - ['op' => 'put', 'type' => …, 'data' => …]    remet une ligne dans l'état noté (même identifiant).
 * Les identifiants sont des UUID générés côté serveur : une ligne supprimée peut être recréée à l'identique.
 */
final class UndoService
{
    /** Durée pendant laquelle une annulation reste possible. */
    private const KEEP = 'PT24H';

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly UndoLogRepository $logs,
        private readonly CabinetRepository $cabinets,
        private readonly NurseRepository $nurses,
        private readonly WorkDayRepository $days,
        private readonly RestRepository $rests,
        private readonly NoteRepository $notes,
        private readonly Today $today,
    ) {
    }

    public static function delete(string $type, Uuid $id): array
    {
        return ['op' => 'delete', 'type' => $type, 'id' => $id->toRfc4122()];
    }

    public static function put(Cabinet|Nurse|WorkDay|Rest|Note $entity): array
    {
        $type = match (true) {
            $entity instanceof Cabinet => 'cabinet',
            $entity instanceof Nurse => 'nurse',
            $entity instanceof WorkDay => 'workday',
            $entity instanceof Rest => 'rest',
            $entity instanceof Note => 'note',
        };

        return ['op' => 'put', 'type' => $type, 'data' => $entity->toArray()];
    }

    /**
     * Enregistre les opérations inverses (sans flush : la modification et son journal partent ensemble).
     *
     * @param list<array<string, mixed>> $operations
     */
    public function record(User $user, array $operations): ?string
    {
        if (!$operations) {
            return null;
        }
        $now = $this->today->now();
        $this->logs->purgeOlderThan($now->sub(new \DateInterval(self::KEEP)));
        $log = new UndoLog($user, $operations, $now);
        $this->em->persist($log);

        return $log->getId()->toRfc4122();
    }

    /** Rejoue les opérations inverses. Retourne false si l'annulation n'existe plus. */
    public function undo(User $user, string $id): bool
    {
        $log = $this->logs->findOwned($user, $id);
        if (!$log instanceof UndoLog) {
            return false;
        }
        $this->em->wrapInTransaction(function () use ($user, $log): void {
            foreach ($log->getOperations() as $op) {
                'delete' === $op['op'] ? $this->applyDelete($user, $op['type'], $op['id']) : $this->applyPut($user, $op['type'], $op['data']);
            }
            $this->em->remove($log);
        });

        return true;
    }

    private function applyDelete(User $user, string $type, string $id): void
    {
        $entity = $this->repo($type)->findOwned($user, $id);
        if ($entity) {
            $this->em->remove($entity);
            $this->em->flush();
        }
    }

    /** @param array<string, mixed> $d */
    private function applyPut(User $user, string $type, array $d): void
    {
        $id = Uuid::fromString($d['id']);
        $existing = $this->repo($type)->findOwned($user, $d['id']);
        $cabinet = isset($d['cabinetId']) ? $this->cabinets->findOwned($user, $d['cabinetId']) : null;
        $nurse = isset($d['nurseId']) ? $this->nurses->findOwned($user, $d['nurseId']) : null;

        switch ($type) {
            case 'cabinet':
                if (!$existing) {
                    $existing = new Cabinet($user, $d['name'], $d['code'], $d['color'], $id);
                    $this->em->persist($existing);
                }
                $existing->update($d['name'], $d['code'], $d['color']);
                $existing->setActive($d['active'] ?? true); // les annulations notées avant le 16/11 n'ont pas ce champ
                break;
            case 'nurse':
                if ($existing) {
                    $existing->rename($d['name']);
                } elseif ($cabinet) {
                    $this->em->persist(new Nurse($cabinet, $d['name'], $id));
                }
                break;
            case 'workday':
                if (!$cabinet) {
                    break; // cabinet supprimé depuis : rien à remettre
                }
                $existing
                    ? $existing->assign($cabinet, $nurse, Slot::from($d['slot']))
                    : $this->em->persist(new WorkDay(Dates::parse($d['date']), $cabinet, $nurse, Slot::from($d['slot']), $id));
                break;
            case 'rest':
                $date = Dates::parse($d['date']);
                $onDate = $this->rests->findOnDate($user, $date);
                if ($onDate && !$onDate->getId()->equals($id)) {
                    $this->em->remove($onDate); // un seul repos par jour
                    $this->em->flush();
                    $onDate = null;
                }
                $onDate ? $onDate->setSlot(Slot::from($d['slot'])) : $this->em->persist(new Rest($user, $date, Slot::from($d['slot']), $id));
                break;
            case 'note':
                if ($existing) {
                    $existing->setText($d['text']);
                    break;
                }
                $note = match (NoteScope::from($d['scope'])) {
                    NoteScope::Day => Note::forDay($user, Dates::parse($d['date']), $d['text'], $id),
                    NoteScope::Cabinet => $cabinet ? Note::forCabinet($cabinet, $d['text'], $id) : null,
                    NoteScope::Nurse => $nurse ? Note::forNurse($nurse, $d['text'], $id) : null,
                };
                if ($note) {
                    $this->em->persist($note);
                }
                break;
        }
        $this->em->flush();
    }

    private function repo(string $type): CabinetRepository|NurseRepository|WorkDayRepository|RestRepository|NoteRepository
    {
        return match ($type) {
            'cabinet' => $this->cabinets,
            'nurse' => $this->nurses,
            'workday' => $this->days,
            'rest' => $this->rests,
            'note' => $this->notes,
        };
    }
}
