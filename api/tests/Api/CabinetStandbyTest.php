<?php

namespace App\Tests\Api;

use App\Tests\ApiTestCase;
use Symfony\Component\Uid\Uuid;

/**
 * Retour du 16/11 : un cabinet « en veille » (remplacement terminé) ne reçoit plus de nouveaux jours,
 * mais garde ses jours, ses compteurs et son historique. Aujourd'hui = 15/11/2026 (voir ApiTestCase).
 */
final class CabinetStandbyTest extends ApiTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->createUser();
        $this->createUser('autre@exemple.fr');
        $this->loginAs();
    }

    private function active(array $planning, string $cabinetId): bool
    {
        return array_column($planning['cabinets'], 'active', 'id')[$cabinetId];
    }

    public function testCabinetsAreActiveByDefaultIncludingRowsCreatedBeforeTheMigration(): void
    {
        [$cab] = $this->cabinet('Les Tilleuls');
        $r = $this->api('GET', '/api/planning');
        self::assertTrue($this->active($r, $cab));

        // Ligne écrite sans la colonne « active », comme les cabinets qui existaient avant la migration.
        $owner = $this->em()->getConnection()->fetchOne("SELECT owner_id FROM cabinet WHERE name = 'Les Tilleuls'");
        $old = Uuid::v7();
        $this->em()->getConnection()->insert('cabinet', ['id' => $old->toBinary(), 'owner_id' => $owner, 'name' => 'Ancien', 'code' => 'AN', 'color' => '#3B82F6']);
        self::assertTrue($this->active($this->api('GET', '/api/planning'), $old->toRfc4122()));
    }

    public function testNoNewDayInAStandbyCabinetButExistingDaysStayEditable(): void
    {
        [$cab, $n] = $this->cabinet('Les Tilleuls', ['Hélène A.']);
        [$pont] = $this->cabinet('Pont');
        $this->api('POST', '/api/days', ['dates' => ['2026-11-20', '2026-11-21'], 'cabinetId' => $cab, 'nurseId' => $n['Hélène A.'], 'slot' => 'full']);
        $pontDay = $this->api('POST', '/api/days', ['dates' => ['2026-11-22'], 'cabinetId' => $pont, 'slot' => 'full'])['planning']['days'];
        $pontDayId = array_values(array_filter($pontDay, fn ($d) => $d['cabinetId'] === $pont))[0]['id'];

        $r = $this->api('PUT', "/api/cabinets/$cab/active", ['active' => false]);
        self::assertResponseIsSuccessful();
        self::assertFalse($this->active($r['planning'], $cab));

        $r = $this->api('POST', '/api/days', ['dates' => ['2026-11-25'], 'cabinetId' => $cab, 'nurseId' => $n['Hélène A.'], 'slot' => 'full']);
        self::assertSame(422, $this->httpStatus());
        self::assertSame('Ce cabinet est en veille : réactivez-le dans sa fiche pour y ajouter des jours.', $r['error']);

        // Déplacer un jour d'un autre cabinet vers le cabinet en veille : refusé aussi.
        $this->api('PUT', "/api/days/$pontDayId", ['cabinetId' => $cab, 'nurseId' => $n['Hélène A.'], 'slot' => 'full']);
        self::assertSame(422, $this->httpStatus());

        // Les jours déjà placés restent modifiables et supprimables.
        $days = array_values(array_filter($r = $this->api('GET', '/api/planning')['days'], fn ($d) => $d['cabinetId'] === $cab));
        $this->api('PUT', '/api/days/'.$days[0]['id'], ['cabinetId' => $cab, 'nurseId' => $n['Hélène A.'], 'slot' => 'am']);
        self::assertResponseIsSuccessful();
        $this->api('DELETE', '/api/days/'.$days[1]['id']);
        self::assertResponseIsSuccessful();

        // Les pense-bêtes restent possibles.
        $this->api('POST', '/api/notes', ['scope' => 'cabinet', 'cabinetId' => $cab, 'text' => 'Y retourner en été ?']);
        self::assertSame(201, $this->httpStatus());
    }

    public function testStandbyKeepsDaysCountersAndHistory(): void
    {
        [$cab] = $this->cabinet('Les Tilleuls');
        $this->api('POST', '/api/days', ['dates' => ['2026-11-02', '2026-11-03'], 'cabinetId' => $cab, 'slot' => 'full']);
        $this->api('POST', '/api/days', ['dates' => ['2026-11-20'], 'cabinetId' => $cab, 'slot' => 'am']);
        $this->api('POST', '/api/days', ['dates' => ['2026-12-01'], 'cabinetId' => $cab, 'slot' => 'full']);
        $before = $this->api('GET', '/api/planning');
        $statsBefore = $this->api('GET', '/api/stats?from=2026-11-01&to=2026-11-30');

        $r = $this->api('PUT', "/api/cabinets/$cab/active", ['active' => false]);
        self::assertEquals(1.5, $r['futureDays'], 'Jours prévus restants, pour le message de confirmation');
        self::assertSame($before['days'], $r['planning']['days']);
        self::assertEquals($statsBefore, $this->api('GET', '/api/stats?from=2026-11-01&to=2026-11-30'));
        self::assertEquals(['total' => 2.5, 'done' => 2, 'todo' => 0.5, 'nurses' => ['-' => 2.5]], $statsBefore['cabinets'][$cab]);
    }

    public function testReactivateAndUndo(): void
    {
        [$cab] = $this->cabinet('Les Tilleuls');

        $r = $this->api('PUT', "/api/cabinets/$cab/active", ['active' => false]);
        self::assertNotNull($r['undoId']);
        $r = $this->api('POST', '/api/undo/'.$r['undoId']);
        self::assertResponseIsSuccessful();
        self::assertTrue($this->active($r['planning'], $cab), "L'annulation remet le cabinet actif");

        $this->api('PUT', "/api/cabinets/$cab/active", ['active' => false]);
        $r = $this->api('PUT', "/api/cabinets/$cab/active", ['active' => true]);
        self::assertTrue($this->active($r['planning'], $cab));
        $this->api('POST', '/api/days', ['dates' => ['2026-11-25'], 'cabinetId' => $cab, 'slot' => 'full']);
        self::assertSame(201, $this->httpStatus(), 'Réactivé : on peut de nouveau y ajouter des jours');

        $r = $this->api('POST', '/api/undo/'.$r['undoId']);
        self::assertFalse($this->active($r['planning'], $cab), "L'annulation de la réactivation remet en veille");

        // Même état demandé deux fois : rien à annuler.
        $r = $this->api('PUT', "/api/cabinets/$cab/active", ['active' => false]);
        self::assertNull($r['undoId']);

        // Modifier le cabinet (nom, couleur…) ne le réactive pas.
        $r = $this->api('PUT', "/api/cabinets/$cab", ['name' => 'Les Tilleuls (2025)', 'color' => '#3B82F6']);
        self::assertFalse($this->active($r['planning'], $cab));
    }

    public function testValidationAndIsolation(): void
    {
        [$cab] = $this->cabinet('Les Tilleuls');
        $r = $this->api('PUT', "/api/cabinets/$cab/active", []);
        self::assertSame(422, $this->httpStatus());
        self::assertSame('Indiquez si le cabinet est actif.', $r['error']);

        $this->loginAs('autre@exemple.fr');
        $this->api('PUT', "/api/cabinets/$cab/active", ['active' => false]);
        self::assertSame(404, $this->httpStatus());

        $this->loginAs();
        self::assertTrue($this->active($this->api('GET', '/api/planning'), $cab));
    }
}
