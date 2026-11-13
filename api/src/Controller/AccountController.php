<?php

namespace App\Controller;

use App\Dto\ZoneInput;
use App\Enum\VacationZone;
use App\Repository\SchoolHolidayRepository;
use App\Service\PlanningSnapshot;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;

/**
 * La connexion elle-même (POST /api/login → jeton JWT) est assurée par le pare-feu Symfony (json_login + Lexik JWT).
 */
#[Route('/api')]
final class AccountController extends ApiController
{
    #[Route('/health', methods: ['GET'])]
    public function health(): JsonResponse
    {
        return $this->json(['status' => 'ok']);
    }

    /** Tout le planning de l'utilisatrice connectée (chargé à l'ouverture de l'application). */
    #[Route('/planning', methods: ['GET'])]
    public function planning(PlanningSnapshot $snapshot): JsonResponse
    {
        return $this->json($snapshot->of($this->me()));
    }

    #[Route('/me', methods: ['PATCH'])]
    public function updateZone(#[MapRequestPayload] ZoneInput $input, EntityManagerInterface $em): JsonResponse
    {
        $this->me()->setVacationZone(VacationZone::from($input->zone));
        $em->flush();

        return $this->withPlanning();
    }

    /** Vacances scolaires de toutes les zones (le front filtre selon le réglage). */
    #[Route('/holidays', methods: ['GET'])]
    public function holidays(SchoolHolidayRepository $repo): JsonResponse
    {
        return $this->json(array_map(static fn ($h) => $h->toArray(), $repo->findAllOrdered()));
    }
}
