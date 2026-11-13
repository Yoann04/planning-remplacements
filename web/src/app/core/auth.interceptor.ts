import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/** Ajoute « Authorization: Bearer <jeton> » aux appels de l'API ; déconnecte si le jeton est refusé (expiré). */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  const isLogin = req.url.endsWith('/api/login');
  if (token && !isLogin) req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  return next(req).pipe(catchError((e: unknown) => {
    if (e instanceof HttpErrorResponse && e.status === 401 && !isLogin) auth.logout();
    return throwError(() => e);
  }));
};

/** Message d'erreur en français à afficher, quelle que soit l'erreur. */
export function errorMessage(e: unknown): string {
  if (e instanceof HttpErrorResponse) {
    if (e.status === 0) return 'Pas de connexion internet. Réessayez dans un instant.';
    if (typeof e.error?.error === 'string') return e.error.error;
    if (e.status === 401) return 'Votre session a expiré. Reconnectez-vous.';
  }
  return 'Une erreur est survenue. Réessayez dans un instant.';
}
