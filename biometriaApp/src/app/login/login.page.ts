import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { eye, eyeOff, fingerPrintOutline, logInOutline, sparklesOutline } from 'ionicons/icons';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class LoginPage {
  credentials = {
    name: '',
    email: '',
    password: '',
  };

  submitted = false;
  isSubmitting = false;
  showPassword = false;
  errorMessage = '';

  constructor(private router: Router) {
    addIcons({
      eye,
      eyeOff,
      fingerPrintOutline,
      logInOutline,
      sparklesOutline,
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async submit(form: NgForm) {
    this.submitted = true;
    this.errorMessage = '';

    if (!form.valid) {
      this.errorMessage = 'Completa todos los campos para continuar.';
      return;
    }

    this.isSubmitting = true;

    const displayName = this.credentials.name.trim();
    const userId = this.buildUserId(displayName, this.credentials.email);

    localStorage.setItem('biometria_logged_in', 'true');
    localStorage.setItem('biometria_user_id', userId);
    localStorage.setItem('biometria_user_name', displayName);
    localStorage.setItem('biometria_user_email', this.credentials.email.trim().toLowerCase());

    await this.router.navigateByUrl('/tabs/tab1', { replaceUrl: true });
    this.isSubmitting = false;
  }

  private buildUserId(name: string, email: string): string {
    const rawSeed = (name || email.split('@')[0] || 'user').toLowerCase();
    const normalized = rawSeed.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const suffix = Math.random().toString(36).slice(2, 8);

    return `user_${normalized || 'guest'}_${suffix}`;
  }
}
