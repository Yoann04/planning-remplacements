<?php

namespace App\Service;

use Psr\Clock\ClockInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/** « Aujourd'hui » dans le fuseau de l'utilisatrice. Les jours faits sont ceux jusqu'à aujourd'hui inclus. */
final readonly class Today
{
    public function __construct(
        private ClockInterface $clock,
        #[Autowire('%env(APP_TIMEZONE)%')] private string $timezone,
    ) {
    }

    public function date(): \DateTimeImmutable
    {
        $now = $this->clock->now()->setTimezone(new \DateTimeZone($this->timezone));

        return new \DateTimeImmutable($now->format('Y-m-d'));
    }

    public function now(): \DateTimeImmutable
    {
        return $this->clock->now();
    }
}
