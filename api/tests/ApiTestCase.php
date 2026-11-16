<?php

namespace App\Tests;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Clock\Test\ClockSensitiveTrait;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/** Outils communs : base vidée avant chaque test, création d'utilisateurs, appels JSON authentifiés. */
abstract class ApiTestCase extends WebTestCase
{
    use ClockSensitiveTrait;

    protected const PASSWORD = 'mot-de-passe-de-test';

    protected KernelBrowser $client;
    private ?string $token = null;

    protected function setUp(): void
    {
        $this->client = static::createClient();
        static::mockTime('2026-11-15 10:00:00 Europe/Paris');
        static::getContainer()->get('cache.rate_limiter')->clear(); // compteur d'essais de connexion remis à zéro
        $conn = $this->em()->getConnection();
        foreach (['undo_log', 'personal_event', 'note', 'rest', 'work_day', 'nurse', 'cabinet', 'school_holiday', 'app_user'] as $t) {
            $conn->executeStatement("DELETE FROM $t");
        }
    }

    protected function em(): EntityManagerInterface
    {
        return static::getContainer()->get(EntityManagerInterface::class);
    }

    protected function createUser(string $email = 'infirmiere@exemple.fr'): User
    {
        $user = new User($email);
        $user->setPassword(static::getContainer()->get(UserPasswordHasherInterface::class)->hashPassword($user, self::PASSWORD));
        $this->em()->persist($user);
        $this->em()->flush();

        return $user;
    }

    /** Se connecte via /api/login et garde le jeton pour les appels suivants. */
    protected function loginAs(string $email = 'infirmiere@exemple.fr'): void
    {
        $this->token = null;
        $r = $this->api('POST', '/api/login', ['email' => $email, 'password' => self::PASSWORD]);
        self::assertResponseIsSuccessful();
        $this->token = $r['token'];
    }

    protected function api(string $method, string $uri, ?array $body = null): array
    {
        $headers = ['CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json'];
        if ($this->token) {
            $headers['HTTP_AUTHORIZATION'] = 'Bearer '.$this->token;
        }
        $this->client->request($method, $uri, server: $headers, content: null === $body ? null : json_encode($body));
        $content = $this->client->getResponse()->getContent();

        return $content ? (json_decode($content, true) ?? []) : [];
    }

    protected function httpStatus(): int
    {
        return $this->client->getResponse()->getStatusCode();
    }

    /** Crée un cabinet avec ses infirmières ; renvoie [idCabinet, [nomInfirmière => id]]. */
    protected function cabinet(string $name, array $nurses = [], string $color = '#3B82F6'): array
    {
        $r = $this->api('POST', '/api/cabinets', ['name' => $name, 'color' => $color, 'nurses' => array_map(fn ($n) => ['name' => $n], $nurses)]);
        self::assertSame(201, $this->httpStatus(), json_encode($r));
        $ids = [];
        foreach ($r['planning']['nurses'] as $n) {
            if ($n['cabinetId'] === $r['cabinetId']) {
                $ids[$n['name']] = $n['id'];
            }
        }

        return [$r['cabinetId'], $ids];
    }

    /** Résumé lisible du planning d'un jour : ['Tilleuls/full', 'repos:am'] */
    protected function dayState(array $planning, string $date): array
    {
        $names = array_column($planning['cabinets'], 'name', 'id');
        $out = [];
        foreach ($planning['days'] as $d) {
            if ($d['date'] === $date) {
                $out[] = $names[$d['cabinetId']].'/'.$d['slot'];
            }
        }
        sort($out);
        foreach ($planning['rests'] as $r) {
            if ($r['date'] === $date) {
                $out[] = 'repos:'.$r['slot'];
            }
        }

        return $out;
    }
}
