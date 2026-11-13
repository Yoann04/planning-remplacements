<?php

namespace App\Controller;

use App\Service\UndoService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Attribute\Route;

final class UndoController extends ApiController
{
    #[Route('/api/undo/{id}', methods: ['POST'])]
    public function undo(string $id, UndoService $undo): JsonResponse
    {
        if (!$undo->undo($this->me(), $id)) {
            throw new NotFoundHttpException('Cette modification ne peut plus être annulée.');
        }

        return $this->withPlanning();
    }
}
