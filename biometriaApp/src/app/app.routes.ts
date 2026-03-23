import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    // Quitamos temporalmente el guard para que te deje ver tu diseño aunque tengas sesión iniciada
    loadComponent: () => import('./login/login.page').then( m => m.LoginPage),
  },
  {
    path: 'tabs', // Le damos un nombre propio a la ruta de las pestañas
    canActivate: [authGuard],
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
  },
  {
    path: '**', // Si escribes cualquier cosa mal, que te mande al login
    redirectTo: 'login'
  }
];