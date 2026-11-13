<?php

namespace App\Enum;

/** Zone de vacances scolaires choisie par l'utilisatrice (Dijon = zone A). */
enum VacationZone: string
{
    case A = 'A';
    case B = 'B';
    case C = 'C';
    case None = 'none';
}
