<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Platforms\AbstractMySQLPlatform;
use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/** Rendez-vous perso (16/11) : nouvelle table, aucune donnée existante modifiée. */
final class Version20261116120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Table personal_event (rendez-vous perso)';
    }

    public function up(Schema $schema): void
    {
        $this->abortIf(!$this->connection->getDatabasePlatform() instanceof AbstractMySQLPlatform, 'Migration prévue pour MySQL ou MariaDB.');
        $this->addSql('CREATE TABLE personal_event (id BINARY(16) NOT NULL, date DATE NOT NULL, slot VARCHAR(4) NOT NULL, label VARCHAR(80) NOT NULL, owner_id BINARY(16) NOT NULL, INDEX IDX_63F74CB17E3C61F9 (owner_id), INDEX idx_personal_event_owner_date (owner_id, date), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('ALTER TABLE personal_event ADD CONSTRAINT FK_PERSONAL_EVENT_OWNER FOREIGN KEY (owner_id) REFERENCES app_user (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        $this->abortIf(!$this->connection->getDatabasePlatform() instanceof AbstractMySQLPlatform, 'Migration prévue pour MySQL ou MariaDB.');
        $this->addSql('DROP TABLE personal_event');
    }
}
