<?php

namespace App\Exception;

/** Règle métier non respectée. Le message (en français) est affiché tel quel à l'utilisatrice. Réponse HTTP 422. */
final class BusinessRuleException extends \DomainException
{
}
