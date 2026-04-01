import { Injectable } from '@angular/core';

export interface SessionUser {
  userId: string;
  name: string;
  email: string;
}

export interface SessionPayload {
  user_id: string;
  name: string;
  email?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private readonly storageKeys = {
    loggedIn: 'biometria_logged_in',
    userId: 'biometria_user_id',
    email: 'biometria_last_email',
    lastUserId: 'biometria_last_user_id',
    name: 'biometria_last_name',
  };

  createSession(payload: SessionPayload, fallbackEmail: string) {
    const email = payload.email || fallbackEmail;

    localStorage.setItem(this.storageKeys.loggedIn, 'true');
    localStorage.setItem(this.storageKeys.userId, payload.user_id);
    localStorage.setItem(this.storageKeys.email, email);
    localStorage.setItem(this.storageKeys.lastUserId, payload.user_id);
    localStorage.setItem(this.storageKeys.name, payload.name);
  }

  clearSession() {
    localStorage.removeItem(this.storageKeys.loggedIn);
    localStorage.removeItem(this.storageKeys.userId);
    localStorage.removeItem(this.storageKeys.email);
    localStorage.removeItem(this.storageKeys.name);
  }

  getCurrentUser(): SessionUser {
    return {
      userId: localStorage.getItem(this.storageKeys.userId) || '',
      name: localStorage.getItem(this.storageKeys.name) || 'Usuario',
      email: localStorage.getItem(this.storageKeys.email) || '',
    };
  }

  hasActiveSession() {
    return (
      localStorage.getItem(this.storageKeys.loggedIn) === 'true' &&
      !!localStorage.getItem(this.storageKeys.userId)
    );
  }

  getLastUserId() {
    return localStorage.getItem(this.storageKeys.lastUserId) || '';
  }
}
