<?php

namespace App\Service;

use App\Entity\Note;
use App\Entity\User;
use App\Enum\NoteScope;
use App\Exception\BusinessRuleException;
use App\Repository\CabinetRepository;
use App\Repository\NurseRepository;
use Doctrine\ORM\EntityManagerInterface;

/** Pense-bêtes rattachés à un jour, à un cabinet ou à une infirmière. */
final class NoteService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly CabinetRepository $cabinets,
        private readonly NurseRepository $nurses,
        private readonly UndoService $undo,
    ) {
    }

    /** @return array{note: Note, undoId: ?string} */
    public function create(User $user, NoteScope $scope, string $text, ?string $date, ?string $cabinetId, ?string $nurseId): array
    {
        $note = match ($scope) {
            NoteScope::Day => Note::forDay($user, Dates::parse($date ?? throw new BusinessRuleException('Indiquez le jour.')), $text),
            NoteScope::Cabinet => Note::forCabinet($this->cabinets->findOwned($user, (string) $cabinetId) ?? throw new BusinessRuleException('Choisissez un cabinet.'), $text),
            NoteScope::Nurse => Note::forNurse($this->nurses->findOwned($user, (string) $nurseId) ?? throw new BusinessRuleException('Choisissez une infirmière.'), $text),
        };
        $this->em->persist($note);
        $undoId = $this->undo->record($user, [UndoService::delete('note', $note->getId())]);
        $this->em->flush();

        return ['note' => $note, 'undoId' => $undoId];
    }

    /** @return array{undoId: ?string} */
    public function update(User $user, Note $note, string $text): array
    {
        $undoId = $this->undo->record($user, [UndoService::put($note)]);
        $note->setText($text);
        $this->em->flush();

        return ['undoId' => $undoId];
    }

    /** @return array{undoId: ?string} */
    public function delete(User $user, Note $note): array
    {
        $undoId = $this->undo->record($user, [UndoService::put($note)]);
        $this->em->remove($note);
        $this->em->flush();

        return ['undoId' => $undoId];
    }
}
