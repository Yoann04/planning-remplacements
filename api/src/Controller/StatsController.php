<?php

namespace App\Controller;

use App\Service\Dates;
use App\Service\StatsService;
use App\Exception\BusinessRuleException;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapQueryParameter;
use Symfony\Component\Routing\Attribute\Route;

final class StatsController extends ApiController
{
    /** Compteurs « Mon activité » entre deux dates incluses (par défaut : tout). */
    #[Route('/api/stats', methods: ['GET'])]
    public function stats(StatsService $stats, #[MapQueryParameter] string $from = '1900-01-01', #[MapQueryParameter] string $to = '2999-12-31'): JsonResponse
    {
        $f = Dates::parse($from);
        $t = Dates::parse($to);
        if ($f > $t) {
            throw new BusinessRuleException('La date de début doit précéder la date de fin.');
        }

        return $this->json($stats->compute($this->me(), $f, $t));
    }
}
