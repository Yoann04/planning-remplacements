<?php

namespace App\Tests\Api;

use App\Tests\ApiTestCase;

final class AuthTest extends ApiTestCase
{
    public function testLoginReturnsAJwt(): void
    {
        $this->createUser();
        $r = $this->api('POST', '/api/login', ['email' => 'infirmiere@exemple.fr', 'password' => self::PASSWORD]);

        self::assertResponseIsSuccessful();
        self::assertCount(3, explode('.', $r['token']), 'Un JWT a trois parties');
    }

    public function testWrongPasswordIsRejected(): void
    {
        $this->createUser();
        $this->api('POST', '/api/login', ['email' => 'infirmiere@exemple.fr', 'password' => 'mauvais']);

        self::assertSame(401, $this->httpStatus());
    }

    public function testPasswordIsStoredHashed(): void
    {
        $user = $this->createUser();

        self::assertNotSame(self::PASSWORD, $user->getPassword());
        self::assertStringStartsWith('$', $user->getPassword());
    }

    public function testApiRequiresAToken(): void
    {
        $this->api('GET', '/api/planning');
        self::assertSame(401, $this->httpStatus());

        $this->createUser();
        $this->loginAs();
        $r = $this->api('GET', '/api/planning');
        self::assertResponseIsSuccessful();
        self::assertSame('infirmiere@exemple.fr', $r['user']['email']);
        self::assertSame('A', $r['user']['zone'], 'Zone A (Dijon) par défaut');
    }

    public function testHealthIsPublic(): void
    {
        $this->api('GET', '/api/health');
        self::assertResponseIsSuccessful();
    }

    public function testTooManyFailedLoginsAreThrottled(): void
    {
        $this->createUser();
        for ($i = 0; $i < 5; ++$i) {
            $this->api('POST', '/api/login', ['email' => 'infirmiere@exemple.fr', 'password' => 'mauvais']);
        }
        $this->api('POST', '/api/login', ['email' => 'infirmiere@exemple.fr', 'password' => self::PASSWORD]);

        self::assertSame(401, $this->httpStatus(), 'Même le bon mot de passe est bloqué après 5 échecs');
    }

    public function testAUserCannotSeeOrTouchAnotherUsersData(): void
    {
        $this->createUser('a@exemple.fr');
        $this->createUser('b@exemple.fr');
        $this->loginAs('a@exemple.fr');
        [$cab] = $this->cabinet('Les Tilleuls');
        $r = $this->api('POST', '/api/days', ['dates' => ['2026-11-20'], 'cabinetId' => $cab, 'slot' => 'full']);
        $dayId = $r['planning']['days'][0]['id'];
        $r = $this->api('POST', '/api/notes', ['scope' => 'day', 'date' => '2026-11-20', 'text' => 'Clé']);
        $noteId = $r['noteId'];
        $undoId = $r['undoId'];

        $this->loginAs('b@exemple.fr');
        $r = $this->api('GET', '/api/planning');
        self::assertSame([], $r['cabinets']);
        self::assertSame([], $r['days']);
        self::assertSame([], $r['notes']);

        $this->api('PUT', "/api/cabinets/$cab", ['name' => 'Piraté', 'color' => '#000000']);
        self::assertSame(404, $this->httpStatus());
        $this->api('DELETE', "/api/cabinets/$cab");
        self::assertSame(404, $this->httpStatus());
        $this->api('DELETE', "/api/days/$dayId");
        self::assertSame(404, $this->httpStatus());
        $this->api('POST', '/api/days', ['dates' => ['2026-11-21'], 'cabinetId' => $cab, 'slot' => 'full']);
        self::assertSame(404, $this->httpStatus());
        $this->api('DELETE', "/api/notes/$noteId");
        self::assertSame(404, $this->httpStatus());
        $this->api('POST', "/api/undo/$undoId");
        self::assertSame(404, $this->httpStatus());

        $this->loginAs('a@exemple.fr');
        $r = $this->api('GET', '/api/planning');
        self::assertSame('Les Tilleuls', $r['cabinets'][0]['name']);
        self::assertCount(1, $r['days']);
        self::assertCount(1, $r['notes']);
    }
}
