<?php

namespace App\Command;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\Argument;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * Pas d'inscription publique : l'administrateur crée le compte (ou change le mot de passe) en ligne de commande.
 * Le mot de passe est demandé de façon masquée : il n'apparaît ni dans l'historique du terminal ni dans le code.
 */
#[AsCommand(name: 'app:user:create', description: "Crée un compte, ou change le mot de passe d'un compte existant")]
final readonly class CreateUserCommand
{
    public function __construct(
        private EntityManagerInterface $em,
        private UserRepository $users,
        private UserPasswordHasherInterface $hasher,
    ) {
    }

    public function __invoke(SymfonyStyle $io, #[Argument('Adresse e-mail')] string $email): int
    {
        if (!filter_var($email, \FILTER_VALIDATE_EMAIL)) {
            $io->error('Adresse e-mail invalide.');

            return 1;
        }
        $password = (string) $io->askHidden('Mot de passe (10 caractères minimum)');
        if (mb_strlen($password) < 10) {
            $io->error('Mot de passe trop court.');

            return 1;
        }
        if ($password !== $io->askHidden('Confirmez le mot de passe')) {
            $io->error('Les deux mots de passe sont différents.');

            return 1;
        }

        $user = $this->users->findOneBy(['email' => mb_strtolower(trim($email))]);
        $isNew = null === $user;
        $user ??= new User($email);
        $user->setPassword($this->hasher->hashPassword($user, $password));
        $this->em->persist($user);
        $this->em->flush();
        $io->success($isNew ? 'Compte créé : '.$user->getEmail() : 'Mot de passe changé pour '.$user->getEmail());

        return 0;
    }
}
