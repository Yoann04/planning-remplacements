import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { UiState } from '../core/ui.state';
import { CabinetSheet } from '../sheets/cabinet-sheet';
import { EntrySheet } from '../sheets/entry-sheet';
import { NoteSheet } from '../sheets/note-sheet';
import { RestSheet } from '../sheets/rest-sheet';
import { SettingsSheet } from '../sheets/settings-sheet';

/** Fenêtre du bas (et son voile). Échap ou toucher le voile la ferme. */
@Component({
  selector: 'app-sheet-host',
  imports: [CabinetSheet, EntrySheet, RestSheet, NoteSheet, SettingsSheet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'ui.closeSheet()' },
  template: `
    @if (ui.sheet(); as sh) {
      <div class="scrim" (click)="ui.closeSheet()"></div>
      <div class="sheet" role="dialog" aria-modal="true" aria-label="Fenêtre">
        @switch (sh.type) {
          @case ('cab') { <app-cabinet-sheet [id]="$any(sh).id" [ret]="$any(sh).ret" /> }
          @case ('entry') { <app-entry-sheet [date]="$any(sh).date" [dates]="$any(sh).dates" [id]="$any(sh).id" /> }
          @case ('rest') { <app-rest-sheet [date]="$any(sh).date" [editing]="$any(sh).editing" /> }
          @case ('note') { <app-note-sheet [id]="$any(sh).id" [cabinetId]="$any(sh).cabinetId ?? null" /> }
          @case ('settings') { <app-settings-sheet /> }
        }
      </div>
    }`,
})
export class SheetHost {
  protected ui = inject(UiState);
}
