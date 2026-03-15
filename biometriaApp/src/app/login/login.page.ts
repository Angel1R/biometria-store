import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { eye, eyeOff, fingerPrintOutline, logInOutline, sparklesOutline } from 'ionicons/icons';
import { ApiService } from '../services/api';

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

  isLoginMode = true; // Toggle para saber si es Login o Registro
  submitted = false;
  isSubmitting = false;
  showPassword = false;
  errorMessage = '';

  constructor(private router: Router, private apiService: ApiService) {
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

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    this.submitted = false;
    this.errorMessage = '';
    this.credentials = { name: '', email: '', password: '' };
  }

  async submit(form: NgForm) {
    this.submitted = true;
    this.errorMessage = '';

    // Validar nombre solo si estamos registrando
    if (!this.isLoginMode && !this.credentials.name.trim()) {
      this.errorMessage = 'Completa todos los campos para continuar.';
      return;
    }

    if (!form.controls['email']?.valid || !form.controls['password']?.valid) {
      this.errorMessage = 'Completa los campos correctamente.';
      return;
    }

    this.isSubmitting = true;

    try {
      if (this.isLoginMode) {
        // --- FLUJO DE INICIO DE SESIÓN ---
        this.apiService.loginUser({
          email: this.credentials.email.trim(),
          password: this.credentials.password
        }).subscribe({
          next: async (res) => {
            this.handleSuccess(res);
          },
          error: (err) => {
            this.errorMessage = err.error?.detail || 'Error al iniciar sesión.';
            this.isSubmitting = false;
          }
        });
      } else {
        // --- FLUJO DE REGISTRO ---
        this.apiService.registerUser({
          name: this.credentials.name.trim(),
          email: this.credentials.email.trim(),
          password: this.credentials.password
        }).subscribe({
          next: async (res) => {
            this.handleSuccess(res);
          },
          error: (err) => {
            this.errorMessage = err.error?.detail || 'Error al registrar usuario.';
            this.isSubmitting = false;
          }
        });
      }
    } catch (e) {
      this.errorMessage = 'Ocurrió un error. Intenta nuevamente.';
      this.isSubmitting = false;
    }
  }

  private async handleSuccess(res: any) {
    localStorage.setItem('biometria_logged_in', 'true');
    localStorage.setItem('biometria_user_id', res.user_id);
    localStorage.setItem('biometria_user_name', res.name);
    if (res.email) {
      localStorage.setItem('biometria_user_email', res.email);
    } else {
      localStorage.setItem('biometria_user_email', this.credentials.email.trim().toLowerCase());
    }

    await this.router.navigateByUrl('/tabs/tab1', { replaceUrl: true });
    this.isSubmitting = false;
  }
}
