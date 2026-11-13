import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/auth.service';
import { errorMessage } from '../core/auth.interceptor';
import { Icon } from '../shared/icon';

/** Connexion. Pas d'inscription : le compte est créé par l'administrateur. */
@Component({
  selector: 'app-login',
  imports: [FormsModule, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:contents' },
  template: `
    <form class="login" (ngSubmit)="submit()" novalidate>
      <div class="logo"><app-icon name="logo" [size]="32" [stroke]="2" /></div>
      <div><h1>Mon planning</h1><p class="hs" style="margin-top:4px">Vos jours de remplacement, partout avec vous.</p></div>
      <div><label for="email">Adresse e-mail</label><input id="email" name="email" type="email" inputmode="email" autocomplete="username" placeholder="prenom.nom@exemple.fr" [(ngModel)]="email"></div>
      <div><label for="pw">Mot de passe</label>
        <div class="pwf"><input id="pw" name="pw" [type]="show() ? 'text' : 'password'" autocomplete="current-password" [(ngModel)]="password">
          <button type="button" (click)="show.set(!show())">{{ show() ? 'Masquer' : 'Afficher' }}</button></div></div>
      <label class="chk"><input type="checkbox" name="remember" [(ngModel)]="remember">Rester connectée</label>
      <p class="err" role="alert">{{ err() }}</p>
      <button class="btn primary big" type="submit" [disabled]="busy()">{{ busy() ? 'Connexion…' : 'Se connecter' }}</button>
      <button class="lnk" type="button" (click)="forgot.set(true)">Mot de passe oublié ?</button>
      @if (forgot()) { <p class="hint">Demandez à Yoann de vous créer un nouveau mot de passe.</p> }
      <p class="hint">Votre compte est déjà créé pour vous.</p>
    </form>`,
})
export class Login {
  private auth = inject(AuthService);
  protected email = signal('');
  protected password = signal('');
  protected remember = signal(true);
  protected show = signal(false);
  protected forgot = signal(false);
  protected busy = signal(false);
  protected err = signal('');

  protected async submit(): Promise<void> {
    const em = this.email().trim();
    if (!/^\S+@\S+\.\S+$/.test(em)) { this.err.set('Entrez une adresse e-mail valide.'); document.getElementById('email')?.focus(); return; }
    if (!this.password()) { this.err.set('Entrez votre mot de passe.'); document.getElementById('pw')?.focus(); return; }
    this.err.set('');
    this.busy.set(true);
    try {
      await this.auth.login(em, this.password(), this.remember());
    } catch (e) {
      const tooMany = e instanceof HttpErrorResponse && e.status === 401 && /too many/i.test(String(e.error?.message ?? ''));
      this.err.set(tooMany ? 'Trop d\'essais. Patientez 15 minutes avant de réessayer.'
        : e instanceof HttpErrorResponse && e.status === 401 ? 'Adresse e-mail ou mot de passe incorrect.' : errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
}
