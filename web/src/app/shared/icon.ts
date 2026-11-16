import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type IconName = 'prev' | 'next' | 'go' | 'plus' | 'x' | 'check' | 'cal' | 'chart' | 'note' | 'logo' | 'up' | 'down';

/** Icônes du prototype (traits SVG). */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:inline-flex' },
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 24 24" fill="none" stroke="currentColor" [attr.stroke-width]="stroke()" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      @switch (name()) {
        @case ('prev') { <path d="M15 5l-7 7 7 7"/> }
        @case ('next') { <path d="M9 5l7 7-7 7"/> }
        @case ('up') { <path d="M5 15l7-7 7 7"/> }
        @case ('down') { <path d="M5 9l7 7 7-7"/> }
        @case ('go') { <path d="M9 5l7 7-7 7"/> }
        @case ('plus') { <path d="M12 5v14M5 12h14"/> }
        @case ('x') { <path d="M6 6l12 12M18 6L6 18"/> }
        @case ('check') { <path d="M5 12.5l4.5 4.5L19 7.5"/> }
        @case ('cal') { <rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/> }
        @case ('chart') { <path d="M5 20V11M12 20V4M19 20v-6"/> }
        @case ('note') { <path d="M6 3.5h9l4 4V20a.5.5 0 01-.5.5H6a.5.5 0 01-.5-.5V4a.5.5 0 01.5-.5z"/><path d="M9 12h6M9 16h4"/> }
        @case ('logo') { <rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17M8 14.5h3"/> }
      }
    </svg>`,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input(20);
  readonly stroke = input(2.4);
}
