<?php

namespace App\Controller;

use App\Dto\NoteInput;
use App\Dto\NoteTextInput;
use App\Enum\NoteScope;
use App\Repository\NoteRepository;
use App\Service\NoteService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/notes')]
final class NoteController extends ApiController
{
    public function __construct(private readonly NoteService $service, private readonly NoteRepository $notes)
    {
    }

    #[Route('', methods: ['POST'])]
    public function create(#[MapRequestPayload] NoteInput $in): JsonResponse
    {
        $r = $this->service->create($this->me(), NoteScope::from($in->scope), $in->text, $in->date, $in->cabinetId, $in->nurseId);

        return $this->withPlanning(['noteId' => $r['note']->getId()->toRfc4122(), 'undoId' => $r['undoId']], 201);
    }

    #[Route('/{id}', methods: ['PUT'])]
    public function update(string $id, #[MapRequestPayload] NoteTextInput $in): JsonResponse
    {
        $user = $this->me();

        return $this->withPlanning($this->service->update($user, $this->found($this->notes->findOwned($user, $id), 'Pense-bête introuvable.'), $in->text));
    }

    #[Route('/{id}', methods: ['DELETE'])]
    public function delete(string $id): JsonResponse
    {
        $user = $this->me();

        return $this->withPlanning($this->service->delete($user, $this->found($this->notes->findOwned($user, $id), 'Pense-bête introuvable.')));
    }
}
