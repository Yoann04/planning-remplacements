<?php

namespace App\Service;

use App\Entity\Cabinet;
use App\Entity\Note;
use App\Entity\Nurse;
use App\Entity\User;
use App\Exception\BusinessRuleException;
use App\Repository\NoteRepository;
use App\Repository\NurseRepository;
use App\Repository\WorkDayRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Uid\Uuid;

/**
 * Création, modification et suppression d'un cabinet.
 * Comme dans l'écran « Modifier le cabinet », les infirmières et les pense-bêtes du cabinet
 * sont envoyés avec le cabinet et synchronisés en une fois (création, renommage, suppression).
 */
final class CabinetService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly NurseRepository $nurses,
        private readonly NoteRepository $notes,
        private readonly WorkDayRepository $days,
        private readonly UndoService $undo,
    ) {
    }

    /** Initiales proposées à partir du nom : « Cabinet des Lilas » → « LI », « Saint-Roch » → « SR ». */
    public static function autoCode(string $name): string
    {
        $stop = ['cabinet', 'des', 'du', 'de', 'la', 'les', 'le', 'l', 'd', 'et', 'infirmier', 'infirmiers', 'infirmière', 'infirmières'];
        $ascii = static fn (string $s): string => mb_strtoupper(transliterator_transliterate('Any-Latin; Latin-ASCII', $s) ?: $s);
        $words = array_values(array_filter(preg_split('/[^\p{L}]+/u', mb_strtolower($name)) ?: [], fn ($w) => '' !== $w && !\in_array($w, $stop, true)));
        if (!$words) {
            return '';
        }

        return 1 === \count($words) ? $ascii(mb_substr($words[0], 0, 2)) : $ascii(mb_substr($words[0], 0, 1).mb_substr($words[1], 0, 1));
    }

    /**
     * @param array{name: string, code?: ?string, color: string, nurses?: list<array{id?: ?string, name: string}>, notes?: list<array{id?: ?string, text: string}>} $data
     */
    public function save(User $user, ?Cabinet $cabinet, array $data): Cabinet
    {
        $name = trim($data['name']);
        $code = trim((string) ($data['code'] ?? '')) ?: self::autoCode($name) ?: mb_substr($name, 0, 2);
        if ($cabinet) {
            $cabinet->update($name, $code, $data['color']);
        } else {
            $cabinet = new Cabinet($user, $name, $code, $data['color']);
            $this->em->persist($cabinet);
        }

        // Infirmières : on garde celles envoyées (renommées si besoin), on crée les nouvelles, on supprime les autres.
        $existing = [];
        foreach ($this->nurses->findByCabinet($cabinet) as $n) {
            $existing[$n->getId()->toRfc4122()] = $n;
        }
        foreach ($data['nurses'] ?? [] as $n) {
            $id = $n['id'] ?? null;
            if ($id && isset($existing[$id])) {
                $existing[$id]->rename($n['name']);
                unset($existing[$id]);
            } elseif ($id && $this->nurses->findOwned($user, $id)) {
                throw new BusinessRuleException("Cette infirmière appartient à un autre cabinet.");
            } else {
                $this->em->persist(new Nurse($cabinet, $n['name'], $id && Uuid::isValid($id) ? Uuid::fromString($id) : null));
            }
        }
        foreach ($existing as $gone) {
            $this->removeNurse($gone);
        }

        // Pense-bêtes du cabinet : même principe.
        $notes = [];
        foreach ($this->notes->findForCabinet($cabinet) as $n) {
            $notes[$n->getId()->toRfc4122()] = $n;
        }
        foreach ($data['notes'] ?? [] as $n) {
            $id = $n['id'] ?? null;
            if ($id && isset($notes[$id])) {
                $notes[$id]->setText($n['text']);
                unset($notes[$id]);
            } else {
                $this->em->persist(Note::forCabinet($cabinet, $n['text']));
            }
        }
        foreach ($notes as $gone) {
            $this->em->remove($gone);
        }

        $this->em->flush();

        return $cabinet;
    }

    /**
     * Supprime le cabinet avec ses infirmières, ses jours et ses pense-bêtes.
     * Tout est noté pour pouvoir annuler (le cabinet revient à l'identique).
     *
     * @return array{days: int, undoId: ?string}
     */
    public function delete(User $user, Cabinet $cabinet): array
    {
        $nurses = $this->nurses->findByCabinet($cabinet);
        $days = $this->days->findByCabinet($cabinet);
        $notes = $this->notes->findForCabinet($cabinet);
        foreach ($nurses as $n) {
            array_push($notes, ...$this->notes->findForNurse($n));
        }
        $ops = [UndoService::put($cabinet), ...array_map(UndoService::put(...), $nurses), ...array_map(UndoService::put(...), $days), ...array_map(UndoService::put(...), $notes)];

        $undoId = $this->undo->record($user, $ops);
        // Suppressions explicites (la base le ferait aussi en cascade, mais SQLite n'applique pas les clés étrangères par défaut).
        foreach ([...$notes, ...$days, ...$nurses, $cabinet] as $entity) {
            $this->em->remove($entity);
        }
        $this->em->flush();

        return ['days' => \count($days), 'undoId' => $undoId];
    }

    /** Supprime une infirmière : ses jours restent dans le planning, sans infirmière indiquée ; ses pense-bêtes partent avec elle. */
    private function removeNurse(Nurse $nurse): void
    {
        foreach ($this->days->findBy(['nurse' => $nurse]) as $day) {
            $day->assign($day->getCabinet(), null, $day->getSlot());
        }
        foreach ($this->notes->findForNurse($nurse) as $note) {
            $this->em->remove($note);
        }
        $this->em->remove($nurse);
    }
}
