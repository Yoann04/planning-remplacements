<?php

namespace App\Tests\Unit;

use App\Enum\Slot;
use App\Service\CabinetService;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class RulesTest extends TestCase
{
    public function testSlotValues(): void
    {
        self::assertSame(1.0, Slot::Full->value());
        self::assertSame(0.5, Slot::Morning->value());
        self::assertSame(0.5, Slot::Afternoon->value());
    }

    #[DataProvider('overlaps')]
    public function testOverlaps(Slot $a, Slot $b, bool $expected): void
    {
        self::assertSame($expected, $a->overlaps($b));
        self::assertSame($expected, $b->overlaps($a));
    }

    public static function overlaps(): iterable
    {
        yield 'journée / matin' => [Slot::Full, Slot::Morning, true];
        yield 'journée / journée' => [Slot::Full, Slot::Full, true];
        yield 'matin / matin' => [Slot::Morning, Slot::Morning, true];
        yield 'matin / après-midi' => [Slot::Morning, Slot::Afternoon, false];
    }

    public function testAutoCode(): void
    {
        self::assertSame('LI', CabinetService::autoCode('Cabinet des Lilas'));
        self::assertSame('SR', CabinetService::autoCode('Saint-Roch'));
        self::assertSame('PO', CabinetService::autoCode('Cabinet du Pont'));
        self::assertSame('EC', CabinetService::autoCode('Écureuils'));
        self::assertSame('', CabinetService::autoCode('Cabinet des'));
    }
}
