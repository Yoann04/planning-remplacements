<?php

namespace App\Service;

use App\Exception\BusinessRuleException;

/** Conversion stricte des dates « AAAA-MM-JJ » échangées avec le front. */
final class Dates
{
    public static function parse(string $value): \DateTimeImmutable
    {
        $d = \DateTimeImmutable::createFromFormat('!Y-m-d', $value);
        if (false === $d || $d->format('Y-m-d') !== $value) {
            throw new BusinessRuleException(sprintf('Date invalide : %s.', $value));
        }

        return $d;
    }

    /**
     * Dates uniques, triées.
     *
     * @param list<string> $values
     *
     * @return list<\DateTimeImmutable>
     */
    public static function parseList(array $values): array
    {
        $unique = array_values(array_unique($values));
        sort($unique);

        return array_map(self::parse(...), $unique);
    }
}
