<?php

namespace App\Tests\Api;

use App\Tests\ApiTestCase;

/** Compteurs « Mon activité ». Aujourd'hui est fixé au 15/11/2026 (voir ApiTestCase). */
final class StatsTest extends ApiTestCase
{
    public function testCountersForAMonth(): void
    {
        $this->createUser();
        $this->loginAs();
        [$ti, $n] = $this->cabinet('Les Tilleuls', ['Hélène A.', 'Isabelle R.']);
        [$po] = $this->cabinet('Pont');

        $this->api('POST', '/api/days', ['dates' => ['2026-11-02', '2026-11-03', '2026-11-15'], 'cabinetId' => $ti, 'nurseId' => $n['Hélène A.'], 'slot' => 'full']);
        $this->api('POST', '/api/days', ['dates' => ['2026-11-16', '2026-11-17'], 'cabinetId' => $ti, 'nurseId' => $n['Isabelle R.'], 'slot' => 'full']);
        $this->api('POST', '/api/days', ['dates' => ['2026-11-26'], 'cabinetId' => $po, 'slot' => 'pm']);
        $this->api('POST', '/api/days', ['dates' => ['2026-12-01'], 'cabinetId' => $po, 'slot' => 'full']); // hors période
        $this->api('POST', '/api/rests', ['dates' => ['2026-11-07', '2026-11-28'], 'slot' => 'full']);
        $this->api('PUT', '/api/rests/2026-11-26', ['slot' => 'am']);

        $s = $this->api('GET', '/api/stats?from=2026-11-01&to=2026-11-30');
        self::assertResponseIsSuccessful();
        self::assertSame('2026-11-15', $s['today']);
        self::assertEquals(['total' => 5.5, 'done' => 3, 'todo' => 2.5], $s['days'], '15/11 compte comme fait (aujourd\'hui inclus)');
        self::assertEquals(['done' => 1, 'todo' => 1.5], $s['rests']);
        self::assertEquals(['total' => 5, 'done' => 3, 'todo' => 2, 'nurses' => [$n['Hélène A.'] => 3, $n['Isabelle R.'] => 2]], $s['cabinets'][$ti]);
        self::assertEquals(['total' => 0.5, 'done' => 0, 'todo' => 0.5, 'nurses' => ['-' => 0.5]], $s['cabinets'][$po]);
        self::assertEquals(['2026-11' => 5.5], $s['months']);

        $all = $this->api('GET', '/api/stats');
        self::assertEquals(6.5, $all['days']['total']);
        self::assertEquals(['2026-11' => 5.5, '2026-12' => 1], $all['months']);
    }

    public function testInvalidPeriod(): void
    {
        $this->createUser();
        $this->loginAs();
        $this->api('GET', '/api/stats?from=2026-12-01&to=2026-11-01');
        self::assertSame(422, $this->httpStatus());
    }
}
