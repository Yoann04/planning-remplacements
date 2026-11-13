<?php

namespace App\Tests\Api;

use App\Tests\ApiTestCase;

/** Règles validées par Yoann : repos voulu, cabinets, annulation. */
final class PlanningRulesTest extends ApiTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->createUser();
        $this->loginAs();
    }

    public function testNurseIsRequiredWhenTheCabinetHasSome(): void
    {
        [$cab, $n] = $this->cabinet('Les Tilleuls', ['Hélène A.', 'Isabelle R.']);

        $r = $this->api('POST', '/api/days', ['dates' => ['2026-11-20'], 'cabinetId' => $cab, 'slot' => 'full']);
        self::assertSame(422, $this->httpStatus());
        self::assertSame("Choisissez l'infirmière remplacée.", $r['error']);

        $this->api('POST', '/api/days', ['dates' => ['2026-11-20'], 'cabinetId' => $cab, 'nurseId' => $n['Hélène A.'], 'slot' => 'full']);
        self::assertSame(201, $this->httpStatus());
    }

    public function testNurseMustBelongToTheCabinet(): void
    {
        [$cab1] = $this->cabinet('Les Tilleuls', ['Hélène A.']);
        [, $n2] = $this->cabinet('Saint-Roch', ['Anne G.']);

        $r = $this->api('POST', '/api/days', ['dates' => ['2026-11-20'], 'cabinetId' => $cab1, 'nurseId' => $n2['Anne G.'], 'slot' => 'full']);
        self::assertSame(422, $this->httpStatus());
        self::assertSame("Cette infirmière n'appartient pas à ce cabinet.", $r['error']);
    }

    public function testTwoCabinetsTheSameDayAreAllowedButExactDuplicatesAreSkipped(): void
    {
        [$a] = $this->cabinet('Acacias');
        [$p] = $this->cabinet('Pont');

        $this->api('POST', '/api/days', ['dates' => ['2026-11-26'], 'cabinetId' => $a, 'slot' => 'am']);
        $r = $this->api('POST', '/api/days', ['dates' => ['2026-11-26'], 'cabinetId' => $p, 'slot' => 'pm']);
        self::assertSame(['Acacias/am', 'Pont/pm'], $this->dayState($r['planning'], '2026-11-26'));

        $r = $this->api('POST', '/api/days', ['dates' => ['2026-11-26', '2026-11-27'], 'cabinetId' => $p, 'slot' => 'pm']);
        self::assertSame(1, $r['added']);
        self::assertSame(1, $r['duplicates']);
    }

    public function testAddingACabinetOverAFullRestRemovesTheRestAndUndoBringsItBack(): void
    {
        [$cab] = $this->cabinet('Les Tilleuls');
        $this->api('POST', '/api/rests', ['dates' => ['2026-11-21', '2026-11-22'], 'slot' => 'full']);

        $r = $this->api('POST', '/api/days', ['dates' => ['2026-11-21', '2026-11-22', '2026-11-23'], 'cabinetId' => $cab, 'slot' => 'am']);
        self::assertSame(3, $r['added']);
        self::assertSame(2, $r['restsRemoved']);
        self::assertSame(['Les Tilleuls/am'], $this->dayState($r['planning'], '2026-11-21'));

        $r = $this->api('POST', '/api/undo/'.$r['undoId']);
        self::assertResponseIsSuccessful();
        self::assertSame(['repos:full'], $this->dayState($r['planning'], '2026-11-21'));
        self::assertSame(['repos:full'], $this->dayState($r['planning'], '2026-11-22'));
        self::assertSame([], $this->dayState($r['planning'], '2026-11-23'));

        $this->api('POST', '/api/undo/'.$r['undoId']);
        self::assertSame(404, $this->httpStatus(), 'Une annulation ne sert qu\'une fois');
    }

    public function testAHalfDayRestCanCoexistWithACabinetOnTheOtherHalf(): void
    {
        [$cab] = $this->cabinet('Pont');
        $this->api('PUT', '/api/rests/2026-11-27', ['slot' => 'am']);

        $r = $this->api('POST', '/api/days', ['dates' => ['2026-11-27'], 'cabinetId' => $cab, 'slot' => 'pm']);
        self::assertSame(0, $r['restsRemoved']);
        self::assertSame(['Pont/pm', 'repos:am'], $this->dayState($r['planning'], '2026-11-27'));

        // Le même cabinet le matin chevauche le repos du matin : le repos est retiré.
        $r = $this->api('POST', '/api/days', ['dates' => ['2026-11-27'], 'cabinetId' => $cab, 'slot' => 'am']);
        self::assertSame(1, $r['restsRemoved']);
        self::assertSame(['Pont/am', 'Pont/pm'], $this->dayState($r['planning'], '2026-11-27'));
    }

    public function testARestOnAnOccupiedPeriodIsRefused(): void
    {
        [$cab] = $this->cabinet('Pont');
        $this->api('POST', '/api/days', ['dates' => ['2026-11-27'], 'cabinetId' => $cab, 'slot' => 'pm']);

        $r = $this->api('PUT', '/api/rests/2026-11-27', ['slot' => 'full']);
        self::assertSame(422, $this->httpStatus());
        self::assertStringContainsString('déjà un cabinet sur cette période', $r['error']);
        $this->api('PUT', '/api/rests/2026-11-27', ['slot' => 'pm']);
        self::assertSame(422, $this->httpStatus());

        $r = $this->api('PUT', '/api/rests/2026-11-27', ['slot' => 'am']);
        self::assertResponseIsSuccessful();
        self::assertSame(['Pont/pm', 'repos:am'], $this->dayState($r['planning'], '2026-11-27'));
    }

    public function testBulkRestsSkipOccupiedDaysAndToggleOff(): void
    {
        [$cab] = $this->cabinet('Pont');
        $this->api('POST', '/api/days', ['dates' => ['2026-11-10'], 'cabinetId' => $cab, 'slot' => 'full']);

        $r = $this->api('POST', '/api/rests', ['dates' => ['2026-11-09', '2026-11-10', '2026-11-11'], 'slot' => 'full', 'toggle' => true]);
        self::assertSame(['set' => 2, 'removed' => 0, 'skipped' => 1], array_intersect_key($r, ['set' => 1, 'removed' => 1, 'skipped' => 1]));

        // Refaire le même geste retire le repos (mode « Ajouter des jours »).
        $r = $this->api('POST', '/api/rests', ['dates' => ['2026-11-09', '2026-11-10', '2026-11-11'], 'slot' => 'full', 'toggle' => true]);
        self::assertSame(2, $r['removed']);
        self::assertSame([], $r['planning']['rests']);

        $r = $this->api('POST', '/api/undo/'.$r['undoId']);
        self::assertCount(2, $r['planning']['rests']);
    }

    public function testEditAndDeleteADayWithUndo(): void
    {
        [$a] = $this->cabinet('Acacias');
        [$p] = $this->cabinet('Pont');
        $r = $this->api('POST', '/api/days', ['dates' => ['2026-11-12'], 'cabinetId' => $a, 'slot' => 'full']);
        $id = $r['planning']['days'][0]['id'];

        $r = $this->api('PUT', "/api/days/$id", ['cabinetId' => $p, 'slot' => 'pm']);
        self::assertSame(['Pont/pm'], $this->dayState($r['planning'], '2026-11-12'));
        $r = $this->api('POST', '/api/undo/'.$r['undoId']);
        self::assertSame(['Acacias/full'], $this->dayState($r['planning'], '2026-11-12'));

        $r = $this->api('DELETE', "/api/days/$id");
        self::assertSame([], $this->dayState($r['planning'], '2026-11-12'));
        $r = $this->api('POST', '/api/undo/'.$r['undoId']);
        self::assertSame(['Acacias/full'], $this->dayState($r['planning'], '2026-11-12'));
        self::assertSame($id, $r['planning']['days'][0]['id'], 'Le jour revient avec le même identifiant');
    }

    public function testDeletingANurseKeepsHerDaysWithoutNurse(): void
    {
        [$cab, $n] = $this->cabinet('Les Tilleuls', ['Hélène A.', 'Isabelle R.']);
        $this->api('POST', '/api/days', ['dates' => ['2026-11-02', '2026-11-03'], 'cabinetId' => $cab, 'nurseId' => $n['Hélène A.'], 'slot' => 'full']);

        $r = $this->api('PUT', "/api/cabinets/$cab", ['name' => 'Les Tilleuls', 'color' => '#3B82F6', 'nurses' => [
            ['id' => $n['Isabelle R.'], 'name' => 'Isabelle Roux'],
            ['name' => 'Claire D.'],
        ]]);
        self::assertResponseIsSuccessful();
        self::assertEqualsCanonicalizing(['Claire D.', 'Isabelle Roux'], array_column($r['planning']['nurses'], 'name'));
        self::assertCount(2, $r['planning']['days']);
        self::assertNull($r['planning']['days'][0]['nurseId']);
    }

    public function testDeletingACabinetRemovesItsDaysAndUndoRestoresEverything(): void
    {
        [$cab, $n] = $this->cabinet('Les Tilleuls', ['Hélène A.']);
        $this->api('POST', '/api/days', ['dates' => ['2026-11-02', '2026-11-03'], 'cabinetId' => $cab, 'nurseId' => $n['Hélène A.'], 'slot' => 'full']);
        $this->api('POST', '/api/notes', ['scope' => 'cabinet', 'cabinetId' => $cab, 'text' => 'Clé chez la voisine']);
        $this->api('POST', '/api/notes', ['scope' => 'nurse', 'nurseId' => $n['Hélène A.'], 'text' => 'Appeler la veille']);
        $before = $this->api('GET', '/api/planning');

        $r = $this->api('DELETE', "/api/cabinets/$cab");
        self::assertSame(2, $r['days']);
        self::assertSame([], $r['planning']['cabinets']);
        self::assertSame([], $r['planning']['days']);
        self::assertSame([], $r['planning']['notes']);

        $r = $this->api('POST', '/api/undo/'.$r['undoId']);
        $sort = static function (array $p): array {
            foreach ($p as &$rows) {
                if (array_is_list($rows)) {
                    usort($rows, static fn ($a, $b) => $a['id'] <=> $b['id']);
                }
            }

            return $p;
        };
        self::assertEquals($sort($before), $sort($r['planning']));
    }

    public function testCabinetCodeIsDerivedFromTheNameWhenEmpty(): void
    {
        $r = $this->api('POST', '/api/cabinets', ['name' => 'Cabinet des Lilas', 'code' => '', 'color' => '#12a594']);
        self::assertSame('LI', $r['planning']['cabinets'][0]['code']);
        self::assertSame('#12A594', $r['planning']['cabinets'][0]['color']);
    }

    public function testValidationMessagesAreInFrench(): void
    {
        $r = $this->api('POST', '/api/cabinets', ['name' => '  ', 'color' => '#3B82F6']);
        self::assertSame(422, $this->httpStatus());
        self::assertSame('Donnez un nom au cabinet.', $r['error']);

        $r = $this->api('POST', '/api/cabinets', ['name' => 'X', 'color' => 'rouge']);
        self::assertSame('Couleur invalide.', $r['error']);

        $r = $this->api('POST', '/api/rests', ['dates' => ['2026-02-30'], 'slot' => 'full']);
        self::assertSame(422, $this->httpStatus());
        self::assertSame('Date invalide.', $r['error']);
    }

    public function testNotesCanBeAttachedToADayACabinetOrANurse(): void
    {
        [$cab, $n] = $this->cabinet('Pont', ['Camille P.']);
        $this->api('POST', '/api/notes', ['scope' => 'day', 'date' => '2026-11-26', 'text' => 'Récupérer la clé avant 13 h.']);
        $this->api('POST', '/api/notes', ['scope' => 'cabinet', 'cabinetId' => $cab, 'text' => 'Prévoir 20 minutes.']);
        $r = $this->api('POST', '/api/notes', ['scope' => 'nurse', 'nurseId' => $n['Camille P.'], 'text' => 'Préfère les SMS.']);
        self::assertEqualsCanonicalizing(['day', 'cabinet', 'nurse'], array_column($r['planning']['notes'], 'scope'));

        $r = $this->api('PUT', '/api/notes/'.$r['noteId'], ['text' => 'Préfère les appels.']);
        self::assertContains('Préfère les appels.', array_column($r['planning']['notes'], 'text'));

        $this->api('POST', '/api/notes', ['scope' => 'cabinet', 'text' => 'Sans cabinet']);
        self::assertSame(422, $this->httpStatus());
    }

    public function testVacationZoneSetting(): void
    {
        $r = $this->api('PATCH', '/api/me', ['zone' => 'none']);
        self::assertSame('none', $r['planning']['user']['zone']);
        $this->api('PATCH', '/api/me', ['zone' => 'D']);
        self::assertSame(422, $this->httpStatus());
    }
}
