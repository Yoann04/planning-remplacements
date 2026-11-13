import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

const KEY = 'planning.token';

/**
 * Jeton JWT. « Rester connectée » : le jeton est gardé dans localStorage (survit à la fermeture de l'appli) ;
 * sinon dans sessionStorage (oublié à la fermeture de l'onglet).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  readonly token = signal<string | null>(read());
  readonly loggedIn = computed(() => !!this.token());

  async login(email: string, password: string, remember: boolean): Promise<void> {
    const r = await firstValueFrom(this.http.post<{ token: string }>(`${environment.apiUrl}/api/login`, { email: email.trim().toLowerCase(), password }));
    clear();
    try { (remember ? localStorage : sessionStorage).setItem(KEY, r.token); } catch { /* navigation privée : jeton gardé en mémoire */ }
    this.token.set(r.token);
  }

  logout(): void {
    clear();
    this.token.set(null);
  }
}

function read(): string | null {
  try { return localStorage.getItem(KEY) ?? sessionStorage.getItem(KEY); } catch { return null; }
}
function clear(): void {
  try { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); } catch { /* rien */ }
}
