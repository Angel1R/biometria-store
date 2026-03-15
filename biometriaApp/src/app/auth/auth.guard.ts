import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

function hasSession(): boolean {
  return (
    localStorage.getItem('biometria_logged_in') === 'true' &&
    !!localStorage.getItem('biometria_user_id')
  );
}

export const authGuard: CanActivateFn = (): boolean | UrlTree => {
  const router = inject(Router);
  return hasSession() ? true : router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = (): boolean | UrlTree => {
  const router = inject(Router);
  return hasSession() ? router.createUrlTree(['/tabs/tab1']) : true;
};
