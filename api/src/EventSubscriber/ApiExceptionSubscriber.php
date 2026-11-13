<?php

namespace App\EventSubscriber;

use App\Exception\BusinessRuleException;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Component\Validator\Exception\ValidationFailedException;

/**
 * Erreurs de l'API en JSON, avec un message en français prêt à afficher : {"error": "…"}.
 * Les détails techniques ne sortent jamais (sauf en mode debug, pour les erreurs 500).
 */
final class ApiExceptionSubscriber implements EventSubscriberInterface
{
    public function __construct(private readonly bool $debug = false)
    {
    }

    public static function getSubscribedEvents(): array
    {
        return [KernelEvents::EXCEPTION => ['onException', 0]];
    }

    public function onException(ExceptionEvent $event): void
    {
        if (!str_starts_with($event->getRequest()->getPathInfo(), '/api')) {
            return;
        }
        $e = $event->getThrowable();

        [$status, $message] = match (true) {
            $e instanceof BusinessRuleException => [422, $e->getMessage()],
            $e->getPrevious() instanceof ValidationFailedException => [422, (string) $e->getPrevious()->getViolations()->get(0)->getMessage()],
            $e instanceof HttpExceptionInterface && 404 === $e->getStatusCode() => [404, str_starts_with($e->getMessage(), 'No route') ? 'Adresse inconnue.' : $e->getMessage()],
            $e instanceof HttpExceptionInterface && 405 === $e->getStatusCode() => [405, 'Méthode non autorisée.'],
            $e instanceof HttpExceptionInterface && $e->getStatusCode() < 500 => [$e->getStatusCode(), 'Requête invalide.'],
            default => [500, $this->debug ? $e->getMessage() : 'Erreur du serveur. Réessayez dans un instant.'],
        };

        $event->setResponse(new JsonResponse(['error' => $message], $status));
    }
}
