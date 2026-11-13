<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Platforms\AbstractMySQLPlatform;
use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/** Schéma initial (MySQL 8 / MariaDB 10.6+). */
final class Version20261113000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Schéma initial : utilisateurs, cabinets, infirmières, jours, repos, pense-bêtes, vacances, annulations';
    }

    public function up(Schema $schema): void
    {
        $this->abortIf(!$this->connection->getDatabasePlatform() instanceof AbstractMySQLPlatform, 'Migration prévue pour MySQL ou MariaDB.');
        $this->addSql('CREATE TABLE school_holiday (id INT AUTO_INCREMENT NOT NULL, zone VARCHAR(3) NOT NULL, name VARCHAR(60) NOT NULL, start_date DATE NOT NULL, end_date DATE NOT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE note (id BINARY(16) NOT NULL, scope VARCHAR(10) NOT NULL, date DATE DEFAULT NULL, text VARCHAR(500) NOT NULL, created_at DATETIME NOT NULL, owner_id BINARY(16) NOT NULL, cabinet_id BINARY(16) DEFAULT NULL, nurse_id BINARY(16) DEFAULT NULL, INDEX IDX_CFBDFA147E3C61F9 (owner_id), INDEX IDX_CFBDFA14D351EC (cabinet_id), INDEX IDX_CFBDFA147373BFAA (nurse_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE cabinet (id BINARY(16) NOT NULL, name VARCHAR(80) NOT NULL, code VARCHAR(3) NOT NULL, color VARCHAR(7) NOT NULL, owner_id BINARY(16) NOT NULL, INDEX IDX_4CED05B07E3C61F9 (owner_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE app_user (id BINARY(16) NOT NULL, email VARCHAR(180) NOT NULL, password VARCHAR(255) NOT NULL, roles JSON NOT NULL, vacation_zone VARCHAR(4) NOT NULL, created_at DATETIME NOT NULL, UNIQUE INDEX UNIQ_88BDF3E9E7927C74 (email), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE nurse (id BINARY(16) NOT NULL, name VARCHAR(80) NOT NULL, owner_id BINARY(16) NOT NULL, cabinet_id BINARY(16) NOT NULL, INDEX IDX_D27E6D437E3C61F9 (owner_id), INDEX IDX_D27E6D43D351EC (cabinet_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE work_day (id BINARY(16) NOT NULL, date DATE NOT NULL, slot VARCHAR(4) NOT NULL, owner_id BINARY(16) NOT NULL, cabinet_id BINARY(16) NOT NULL, nurse_id BINARY(16) DEFAULT NULL, INDEX idx_workday_owner_date (owner_id, date), INDEX IDX_9FCE7E0C7E3C61F9 (owner_id), INDEX IDX_9FCE7E0CD351EC (cabinet_id), INDEX IDX_9FCE7E0C7373BFAA (nurse_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE rest (id BINARY(16) NOT NULL, date DATE NOT NULL, slot VARCHAR(4) NOT NULL, owner_id BINARY(16) NOT NULL, UNIQUE INDEX uniq_rest_owner_date (owner_id, date), INDEX IDX_FD1421D07E3C61F9 (owner_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE undo_log (id BINARY(16) NOT NULL, created_at DATETIME NOT NULL, operations JSON NOT NULL, owner_id BINARY(16) NOT NULL, INDEX IDX_310C74D67E3C61F9 (owner_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('ALTER TABLE note ADD CONSTRAINT FK_CFBDFA147E3C61F9 FOREIGN KEY (owner_id) REFERENCES app_user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE note ADD CONSTRAINT FK_CFBDFA14D351EC FOREIGN KEY (cabinet_id) REFERENCES cabinet (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE note ADD CONSTRAINT FK_CFBDFA147373BFAA FOREIGN KEY (nurse_id) REFERENCES nurse (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE cabinet ADD CONSTRAINT FK_4CED05B07E3C61F9 FOREIGN KEY (owner_id) REFERENCES app_user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE nurse ADD CONSTRAINT FK_D27E6D437E3C61F9 FOREIGN KEY (owner_id) REFERENCES app_user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE nurse ADD CONSTRAINT FK_D27E6D43D351EC FOREIGN KEY (cabinet_id) REFERENCES cabinet (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE work_day ADD CONSTRAINT FK_9FCE7E0C7E3C61F9 FOREIGN KEY (owner_id) REFERENCES app_user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE work_day ADD CONSTRAINT FK_9FCE7E0CD351EC FOREIGN KEY (cabinet_id) REFERENCES cabinet (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE work_day ADD CONSTRAINT FK_9FCE7E0C7373BFAA FOREIGN KEY (nurse_id) REFERENCES nurse (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE rest ADD CONSTRAINT FK_FD1421D07E3C61F9 FOREIGN KEY (owner_id) REFERENCES app_user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE undo_log ADD CONSTRAINT FK_310C74D67E3C61F9 FOREIGN KEY (owner_id) REFERENCES app_user (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('SET FOREIGN_KEY_CHECKS = 0');
        $this->addSql('DROP TABLE undo_log');
        $this->addSql('DROP TABLE rest');
        $this->addSql('DROP TABLE work_day');
        $this->addSql('DROP TABLE note');
        $this->addSql('DROP TABLE nurse');
        $this->addSql('DROP TABLE cabinet');
        $this->addSql('DROP TABLE school_holiday');
        $this->addSql('DROP TABLE app_user');
        $this->addSql('SET FOREIGN_KEY_CHECKS = 1');
    }
}
