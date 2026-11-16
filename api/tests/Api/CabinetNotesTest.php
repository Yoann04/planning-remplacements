<?php

namespace App\Tests\Api;

use App\Tests\ApiTestCase;

/** Retour du 16/11 : la fiche d'un cabinet affiche ses pense-bêtes et ceux de ses infirmières. */
final class CabinetNotesTest extends ApiTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->createUser();
        $this->createUser('autre@exemple.fr');
        $this->loginAs();
    }

    public function testThePlanningReturnsTheNotesOfACabinetAndOfItsNurses(): void
    {
        [$cab, $n] = $this->cabinet('Les Tilleuls', ['Hélène A.', 'Anne G.']);
        [$other] = $this->cabinet('Saint-Roch');

        $r = $this->api('POST', '/api/notes', ['scope' => 'cabinet', 'cabinetId' => $cab, 'text' => 'Clé chez la voisine']);
        self::assertSame(201, $this->httpStatus());
        $this->api('POST', '/api/notes', ['scope' => 'nurse', 'nurseId' => $n['Anne G.'], 'text' => 'Préfère les matins']);
        $this->api('POST', '/api/notes', ['scope' => 'cabinet', 'cabinetId' => $other, 'text' => 'Autre cabinet']);
        $this->api('POST', '/api/notes', ['scope' => 'day', 'date' => '2026-11-20', 'text' => 'Du jour']);

        $notes = $this->api('GET', '/api/planning')['notes'];
        $ofTilleuls = array_values(array_filter($notes, fn ($x) => $x['cabinetId'] === $cab || $x['nurseId'] === $n['Anne G.']));
        self::assertEqualsCanonicalizing(
            [['cabinet', $cab, null, 'Clé chez la voisine'], ['nurse', null, $n['Anne G.'], 'Préfère les matins']],
            array_map(fn ($x) => [$x['scope'], $x['cabinetId'], $x['nurseId'], $x['text']], $ofTilleuls),
        );
        self::assertCount(4, $notes);

        // Modifier puis annuler : le texte d'origine revient.
        $m = $this->api('PUT', '/api/notes/'.$r['noteId'], ['text' => 'Clé chez le pharmacien']);
        self::assertContains('Clé chez le pharmacien', array_column($m['planning']['notes'], 'text'));
        $m = $this->api('POST', '/api/undo/'.$m['undoId']);
        self::assertContains('Clé chez la voisine', array_column($m['planning']['notes'], 'text'));

        // Annuler l'ajout depuis la fiche du cabinet
        $r = $this->api('POST', '/api/undo/'.$r['undoId']);
        self::assertResponseIsSuccessful();
        self::assertCount(3, $r['planning']['notes']);
    }

    public function testCabinetNotesStayPrivateToTheirOwner(): void
    {
        [$cab, $n] = $this->cabinet('Les Tilleuls', ['Hélène A.']);
        $id = $this->api('POST', '/api/notes', ['scope' => 'cabinet', 'cabinetId' => $cab, 'text' => 'Code de la porte'])['noteId'];
        $this->api('POST', '/api/notes', ['scope' => 'nurse', 'nurseId' => $n['Hélène A.'], 'text' => 'Remplacement de mars']);

        $this->loginAs('autre@exemple.fr');
        self::assertSame([], $this->api('GET', '/api/planning')['notes']);

        $r = $this->api('POST', '/api/notes', ['scope' => 'cabinet', 'cabinetId' => $cab, 'text' => 'Intrus']);
        self::assertSame(422, $this->httpStatus());
        self::assertSame('Choisissez un cabinet.', $r['error']);
        $this->api('POST', '/api/notes', ['scope' => 'nurse', 'nurseId' => $n['Hélène A.'], 'text' => 'Intrus']);
        self::assertSame(422, $this->httpStatus());
        $this->api('PUT', '/api/notes/'.$id, ['text' => 'Modifié']);
        self::assertSame(404, $this->httpStatus());
        $this->api('DELETE', '/api/notes/'.$id);
        self::assertSame(404, $this->httpStatus());
    }
}
