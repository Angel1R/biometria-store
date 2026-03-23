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
import { fingerPrintOutline, logInOutline, sparklesOutline, fingerPrint, sparkles, handRightOutline, starOutline } from 'ionicons/icons';
import { ApiService } from '../services/api';
import { NativeBiometric } from 'capacitor-native-biometric';

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
  credentials = { name: '', email: '', password: '' };
  isLoginMode = true;
  submitted = false;
  isSubmitting = false;
  errorMessage = '';
  canUseBiometrics = false;

  constructor(private router: Router, private apiService: ApiService) {
    addIcons({ fingerPrintOutline, logInOutline, sparklesOutline, fingerPrint, sparkles, handRightOutline, starOutline });
  }

  async ngOnInit() {
    try {
      const result = await NativeBiometric.isAvailable();
      this.canUseBiometrics = result.isAvailable;
    } catch (e) {
      this.canUseBiometrics = false;
    }
  }

  async loginWithBiometrics() {
    try {
      const lastEmail = localStorage.getItem('biometria_last_email');
      if (!lastEmail) {
        this.errorMessage = 'Inicia sesión con contraseña primero.';
        return;
      }
      await NativeBiometric.verifyIdentity({
        reason: "Acceso Seguro a BiometriaStore",
        title: "Identidad Requerida",
      });
      this.isSubmitting = true;
      this.handleSuccess({
        user_id: localStorage.getItem('biometria_last_user_id') || 'usr_demo',
        name: localStorage.getItem('biometria_last_name') || 'Usuario',
        email: lastEmail
      });
    } catch (error) {
      this.errorMessage = 'Biometría cancelada o fallida.';
    }
  }

  onToggleChange(event: any) {
    this.isLoginMode = event.detail ? !event.detail.checked : !event;
    this.errorMessage = '';
    this.submitted = false;
  }

  async submit(form: NgForm) {
    this.submitted = true;
    if (!form.valid) {
      this.errorMessage = 'Revisa los datos del formulario.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const request = this.isLoginMode 
      ? this.apiService.loginUser({ email: this.credentials.email.trim(), password: this.credentials.password })
      : this.apiService.registerUser({ name: this.credentials.name.trim(), email: this.credentials.email.trim(), password: this.credentials.password });

    request.subscribe({
      next: (res) => this.handleSuccess(res),
      error: (err) => {
        this.errorMessage = err.error?.detail || 'Error en la conexión.';
        this.isSubmitting = false;
      }
    });
  }

  private async handleSuccess(res: any) {
    this.isSubmitting = false;

    // LA MAGIA ESTÁ AQUÍ: Separamos el Registro del Login
    if (!this.isLoginMode) {
      // SI ES REGISTRO: Se queda en la pantalla y te pide iniciar sesión
      this.isLoginMode = true; 
      this.credentials.password = ''; // Limpia la clave por seguridad
      this.submitted = false;
      this.errorMessage = '¡Registro exitoso! Ahora inicia sesión.'; 
    } else {
      // SI ES LOGIN: Guarda tus datos, pide huella y te manda al inicio
      localStorage.setItem('biometria_last_email', res.email || this.credentials.email);
      localStorage.setItem('biometria_last_user_id', res.user_id);
      localStorage.setItem('biometria_last_name', res.name);

      if (this.canUseBiometrics) {
        try {
          await NativeBiometric.verifyIdentity({ reason: "Vincula tu huella para entrar rápido" });
        } catch (e) { }
      }

      await this.router.navigateByUrl('/tabs/tab1', { replaceUrl: true });
    }
  }
}