<?php

namespace App\Enum;

/** À quoi un pense-bête est rattaché. */
enum NoteScope: string
{
    case Day = 'day';
    case Cabinet = 'cabinet';
    case Nurse = 'nurse';
}
