<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Platforms\AbstractMySQLPlatform;
use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/** Cabinets actifs / en veille (retour utilisatrice du 16/11). Les cabinets existants restent actifs ; rien n'est supprimé. */
final class Version20261116000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Cabinet : colonne active (vrai par défaut)';
    }

    public function up(Schema $schema): void
    {
        $this->abortIf(!$this->connection->getDatabasePlatform() instanceof AbstractMySQLPlatform, 'Migration prévue pour MySQL ou MariaDB.');
        $this->addSql('ALTER TABLE cabinet ADD active TINYINT(1) DEFAULT 1 NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->abortIf(!$this->connection->getDatabasePlatform() instanceof AbstractMySQLPlatform, 'Migration prévue pour MySQL ou MariaDB.');
        $this->addSql('ALTER TABLE cabinet DROP active');
    }
}
