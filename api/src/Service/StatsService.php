<?php

namespace App\Service;

use App\Entity\User;
use App\Repository\RestRepository;
use App\Repository\WorkDayRepository;

/**
 * Compteurs de « Mon activité » sur une période.
 * « Faits » = jusqu'à aujourd'hui inclus ; « prévus » = après aujourd'hui.
 * Un repos qui chevauche un cabinet le même jour n'est pas compté (cas qui ne devrait pas exister).
 */
final readonly class StatsService
{
    public function __construct(
        private WorkDayRepository $days,
        private RestRepository $rests,
        private Today $today,
    ) {
    }

    /**
     * @return array{
     *   from: string, to: string, today: string,
     *   days: array{total: float, done: float, todo: float},
     *   rests: array{done: float, todo: float},
     *   cabinets: array<string, array{total: float, done: float, todo: float, nurses: array<string, float>}>,
     *   months: array<string, float>
     * }
     */
    public function compute(User $user, \DateTimeImmutable $from, \DateTimeImmutable $to): array
    {
        $today = $this->today->date();
        $total = $done = 0.0;
        $byDate = $cabinets = $months = [];

        foreach ($this->days->findBetween($user, $from, $to) as $w) {
            $v = $w->getSlot()->value();
            $isDone = $w->getDate() <= $today;
            $total += $v;
            $done += $isDone ? $v : 0;
            $byDate[$w->getDate()->format('Y-m-d')][] = $w;

            $cid = $w->getCabinet()->getId()->toRfc4122();
            $c = $cabinets[$cid] ?? ['total' => 0.0, 'done' => 0.0, 'todo' => 0.0, 'nurses' => []];
            $c['total'] += $v;
            $c[$isDone ? 'done' : 'todo'] += $v;
            $nid = $w->getNurse()?->getId()->toRfc4122() ?? '-';
            $c['nurses'][$nid] = ($c['nurses'][$nid] ?? 0) + $v;
            $cabinets[$cid] = $c;

            $m = $w->getDate()->format('Y-m');
            $months[$m] = ($months[$m] ?? 0) + $v;
        }

        $restDone = $restTodo = 0.0;
        foreach ($this->rests->findBetween($user, $from, $to) as $r) {
            if (PlanningService::restClashes($r->getSlot(), $byDate[$r->getDate()->format('Y-m-d')] ?? [])) {
                continue;
            }
            $r->getDate() <= $today ? $restDone += $r->getSlot()->value() : $restTodo += $r->getSlot()->value();
        }
        ksort($months);

        return [
            'from' => $from->format('Y-m-d'),
            'to' => $to->format('Y-m-d'),
            'today' => $today->format('Y-m-d'),
            'days' => ['total' => $total, 'done' => $done, 'todo' => $total - $done],
            'rests' => ['done' => $restDone, 'todo' => $restTodo],
            'cabinets' => $cabinets,
            'months' => $months,
        ];
    }
}
