<?php

namespace App\Tests\Api;

use App\Tests\ApiTestCase;

/**
 * Rendez-vous perso (16/11) : saisis par l'utilisatrice, simple information. Plusieurs par jour,
 * jamais bloquants pour le travail, sans effet sur les jours, les repos ni les compteurs.
 */
final class PersonalEventTest extends ApiTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->createUser();
        $this->createUser('autre@exemple.fr');
        $this->loginAs();
    }

    /** Résumé des rendez-vous d'un jour : ['am:Dentiste des enfants', 'full:RDV perso'] */
    private function eventsOn(array $planning, string $date): array
    {
        $out = [];
        foreach ($planning['events'] as $e) {
            if ($e['date'] === $date) {
                $out[] = $e['slot'].':'.$e['label'];
            }
        }
        sort($out);

        return $out;
    }

    public function testAddOnSeveralDaysWithDefaultLabelAndSeveralTheSameDay(): void
    {
        $r = $this->api('POST', '/api/events', ['dates' => ['2026-11-24', '2026-11-25'], 'slot' => 'am', 'label' => '  Réunion école ']);
        self::assertSame(201, $this->httpStatus());
        self::assertSame(2, $r['added']);
        self::assertNotNull($r['undoId']);

        $r = $this->api('POST', '/api/events', ['dates' => ['2026-11-24'], 'slot' => 'full', 'label' => '']);
        self::assertSame(['am:Réunion école', 'full:RDV perso'], $this->eventsOn($r['planning'], '2026-11-24'));
        self::assertSame(['am:Réunion école'], $this->eventsOn($r['planning'], '2026-11-25'));
    }

    public function testNeverBlocksWorkNorChangesDaysRestsOrCounters(): void
    {
        [$cab] = $this->cabinet('Les Tilleuls');
        $this->api('POST', '/api/days', ['dates' => ['2026-11-24'], 'cabinetId' => $cab, 'slot' => 'full']);
        $this->api('PUT', '/api/rests/2026-11-26', ['slot' => 'pm']);
        $statsBefore = $this->api('GET', '/api/stats?from=2026-11-01&to=2026-11-30');

        // Rendez-vous sur un jour travaillé et sur un jour de repos : accepté, rien n'est retiré.
        $r = $this->api('POST', '/api/events', ['dates' => ['2026-11-24', '2026-11-26'], 'slot' => 'full', 'label' => 'Mariage']);
        self::assertSame(201, $this->httpStatus());
        self::assertSame(['Les Tilleuls/full'], $this->dayState($r['planning'], '2026-11-24'));
        self::assertSame(['repos:pm'], $this->dayState($r['planning'], '2026-11-26'));

        // Et l'inverse : travailler un jour qui a déjà un rendez-vous perso.
        $this->api('POST', '/api/events', ['dates' => ['2026-11-27'], 'slot' => 'am', 'label' => 'RDV']);
        $r = $this->api('POST', '/api/days', ['dates' => ['2026-11-27'], 'cabinetId' => $cab, 'slot' => 'am']);
        self::assertSame(201, $this->httpStatus());
        self::assertSame(['am:RDV'], $this->eventsOn($r['planning'], '2026-11-27'));

        $statsAfter = $this->api('GET', '/api/stats?from=2026-11-01&to=2026-11-30');
        self::assertEquals($statsBefore['rests'], $statsAfter['rests']);
        self::assertEquals($statsBefore['days']['total'] + 0.5, $statsAfter['days']['total'], 'Seul le jour de cabinet ajouté compte');
    }

    public function testEditAndDeleteWithUndoLeaveTheRestOfTheDayAlone(): void
    {
        [$cab] = $this->cabinet('Pont');
        $this->api('POST', '/api/days', ['dates' => ['2026-11-24'], 'cabinetId' => $cab, 'slot' => 'pm']);
        $this->api('POST', '/api/notes', ['scope' => 'day', 'date' => '2026-11-24', 'text' => 'Pense-bête du jour']);
        $this->api('POST', '/api/events', ['dates' => ['2026-11-24'], 'slot' => 'am', 'label' => 'Garage']);
        $r = $this->api('POST', '/api/events', ['dates' => ['2026-11-24'], 'slot' => 'full', 'label' => 'Autre']);
        $id = array_values(array_filter($r['planning']['events'], fn ($e) => 'Garage' === $e['label']))[0]['id'];

        $r = $this->api('PUT', "/api/events/$id", ['slot' => 'pm', 'label' => 'Garage (pneus)']);
        self::assertResponseIsSuccessful();
        self::assertSame(['full:Autre', 'pm:Garage (pneus)'], $this->eventsOn($r['planning'], '2026-11-24'));
        $r = $this->api('POST', '/api/undo/'.$r['undoId']);
        self::assertSame(['am:Garage', 'full:Autre'], $this->eventsOn($r['planning'], '2026-11-24'));

        $r = $this->api('DELETE', "/api/events/$id");
        self::assertResponseIsSuccessful();
        self::assertSame(['full:Autre'], $this->eventsOn($r['planning'], '2026-11-24'));
        self::assertSame(['Pont/pm'], $this->dayState($r['planning'], '2026-11-24'), 'Le jour de travail ne bouge pas');
        self::assertCount(1, $r['planning']['notes'], 'Le pense-bête ne bouge pas');

        $r = $this->api('POST', '/api/undo/'.$r['undoId']);
        self::assertSame(['am:Garage', 'full:Autre'], $this->eventsOn($r['planning'], '2026-11-24'));
        self::assertSame($id, array_values(array_filter($r['planning']['events'], fn ($e) => 'Garage' === $e['label']))[0]['id'], 'Même identifiant après annulation');
    }

    public function testValidation(): void
    {
        $r = $this->api('POST', '/api/events', ['dates' => [], 'slot' => 'full']);
        self::assertSame(422, $this->httpStatus());
        self::assertSame('Choisissez au moins un jour.', $r['error']);

        $r = $this->api('POST', '/api/events', ['dates' => ['2026-02-30'], 'slot' => 'full']);
        self::assertSame(422, $this->httpStatus());

        $r = $this->api('POST', '/api/events', ['dates' => ['2026-11-24'], 'slot' => 'soir']);
        self::assertSame('Durée invalide.', $r['error']);

        $r = $this->api('POST', '/api/events', ['dates' => ['2026-11-24'], 'slot' => 'full', 'label' => str_repeat('a', 81)]);
        self::assertSame('Texte trop long (80 caractères au maximum).', $r['error']);
    }

    public function testEventsStayPrivateToTheirOwner(): void
    {
        $r = $this->api('POST', '/api/events', ['dates' => ['2026-11-24'], 'slot' => 'full', 'label' => 'Privé']);
        $id = $r['planning']['events'][0]['id'];

        $this->loginAs('autre@exemple.fr');
        self::assertSame([], $this->api('GET', '/api/planning')['events']);
        $this->api('PUT', "/api/events/$id", ['slot' => 'am', 'label' => 'Intrus']);
        self::assertSame(404, $this->httpStatus());
        $this->api('DELETE', "/api/events/$id");
        self::assertSame(404, $this->httpStatus());

        $this->loginAs();
        self::assertSame(['full:Privé'], $this->eventsOn($this->api('GET', '/api/planning'), '2026-11-24'));
    }
}
