import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, IonChip, IonIcon, IonLabel, IonCard, IonCardContent, 
  IonToggle, IonList, IonItem, IonInput, IonText, IonInputPasswordToggle, 
  IonButton, IonSpinner 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { fingerPrintOutline, logInOutline, sparklesOutline } from 'ionicons/icons';
import { ApiService } from '../services/api';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonContent, IonChip, IonIcon, IonLabel, IonCard, IonCardContent, 
    IonToggle, IonList, IonItem, IonInput, IonText, IonInputPasswordToggle, 
    IonButton, IonSpinner
  ]
})
export class LoginPage implements OnInit {
  credentials = {
    name: '',
    email: '',
    password: '',
  };

  isLoginMode = true; // Toggle para saber si es Login o Registro
  submitted = false;
  isSubmitting = false;
  errorMessage = '';
  canUseBiometrics = false;

  constructor(private router: Router, private apiService: ApiService) {
    addIcons({
      fingerPrintOutline,
      logInOutline,
      sparklesOutline,
    });
  }

  async ngOnInit() {
    // Comprobar si el dispositivo soporta biometría (FaceID / Huella)
    try {
      const result = await NativeBiometric.isAvailable();
      this.canUseBiometrics = result.isAvailable;
    } catch (e) {
      console.log('La biometría no está disponible en este entorno', e);
      this.canUseBiometrics = false;
    }
  }

  async loginWithBiometrics() {
    try {
      // Intentar recuperar el correo del último usuario que ingresó exitosamente
      const lastEmail = localStorage.getItem('biometria_last_email');
      
      if (!lastEmail) {
        this.errorMessage = 'No hay un usuario previo guardado para usar biometría. Inicia sesión primero con contraseña.';
        return;
      }

      // Lanzar el prompt nativo de Android/iOS
      await NativeBiometric.verifyIdentity({
        reason: "Verifica tu identidad para entrar a BiometriaStore",
        title: "Acceso Seguro",
        subtitle: "Usa tu huella o rostro",
        description: "Accede rápidamente a tus recomendaciones"
      });

      // Si pasa la identidad nativa, lo simulamos como acceso exitoso para la app
      // En un entorno real as de máxima seguridad usaríamos Capacitor Secure Storage
      // para encriptar y desencriptar la contraseña.
      this.isSubmitting = true;
      this.handleSuccess({
        user_id: localStorage.getItem('biometria_last_user_id') || 'usr_biometric_demo',
        name: localStorage.getItem('biometria_last_name') || 'Usuario Biometría',
        email: lastEmail
      });

    } catch (error) {
      console.error('Error o cancelación en biometría:', error);
      this.errorMessage = 'La autenticación biométrica falló o fue cancelada.';
    }
  }

  onToggleChange(event: any) {
    // Si el toggle está activo (true), significa que es Registro (isLoginMode = false)
    this.isLoginMode = !event.detail.checked;
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
    
    // Guardar estos datos extra para usarlos luego en el Login Biométrico
    localStorage.setItem('biometria_last_user_id', res.user_id);
    localStorage.setItem('biometria_last_name', res.name);

    if (res.email) {
      localStorage.setItem('biometria_user_email', res.email);
      localStorage.setItem('biometria_last_email', res.email);
    } else {
      localStorage.setItem('biometria_user_email', this.credentials.email.trim().toLowerCase());
      localStorage.setItem('biometria_last_email', this.credentials.email.trim().toLowerCase());
    }

    await this.router.navigateByUrl('/tabs/tab1', { replaceUrl: true });
    this.isSubmitting = false;
  }
}
