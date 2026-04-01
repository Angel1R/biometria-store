import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonIcon,
  IonSpinner,
  IonText,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  eyeOffOutline,
  eyeOutline,
  fingerPrint,
  fingerPrintOutline,
  handRightOutline,
  sparkles,
  starOutline,
} from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';
import { NativeBiometricService } from '../auth/native-biometric.service';
import { SessionService, type SessionPayload } from '../auth/session.service';
import { ApiService } from '../services/api';
import {
  FaceRecognitionService,
  type FaceLoginResponse,
} from '../services/face-recognition.service';

const createFieldId = (field: string) => `login-${field}-${Math.random().toString(36).slice(2, 8)}`;

type AuthMode = 'login' | 'register';

interface CredentialsForm {
  name: string;
  email: string;
  password: string;
}

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    FormsModule,
    IonButton,
    IonCard,
    IonCardContent,
    IonContent,
    IonIcon,
    IonSpinner,
    IonText,
  ],
})
export class LoginPage implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly apiService = inject(ApiService);
  private readonly sessionService = inject(SessionService);
  private readonly nativeBiometricService = inject(NativeBiometricService);
  private readonly faceRecognitionService = inject(FaceRecognitionService);

  credentials: CredentialsForm = { name: '', email: '', password: '' };
  readonly fieldIds = {
    name: createFieldId('name'),
    email: createFieldId('email'),
    password: createFieldId('password'),
  };

  mode: AuthMode = 'login';
  submitted = false;
  isSubmitting = false;
  errorMessage = '';
  showPassword = false;
  faceLoginAvailable = false;
  biometricLoginEnabled = false;
  biometricLabel = 'biometria nativa';

  constructor() {
    addIcons({
      eyeOffOutline,
      eyeOutline,
      fingerPrint,
      fingerPrintOutline,
      handRightOutline,
      sparkles,
      starOutline,
    });
  }

  get isLoginMode() {
    return this.mode === 'login';
  }

  async ngOnInit() {
    await this.refreshFaceStatus();
    await this.refreshBiometricState();
    await this.bindBiometryListener();
  }

  async ionViewWillEnter() {
    await this.refreshFaceStatus();
    await this.refreshBiometricState();
  }

  setAuthMode(mode: AuthMode) {
    this.mode = mode;
    this.errorMessage = '';
    this.showPassword = false;
    this.submitted = false;
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async loginWithBiometrics() {
    if (!this.biometricLoginEnabled) {
      this.errorMessage = 'Todavia no hay acceso biometrico registrado en este dispositivo.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      const secureCredentials = await this.nativeBiometricService.authenticateAndGetCredentials();
      const email = secureCredentials.username.trim();
      const response = await firstValueFrom(
        this.apiService.loginUser({
          email,
          password: secureCredentials.password,
        })
      );

      await this.handleSuccess(response, email);
    } catch (error: any) {
      this.errorMessage = error?.error?.detail || 'No fue posible iniciar sesion con biometria.';
      this.isSubmitting = false;
    }
  }

  async loginWithFace() {
    if (!this.faceLoginAvailable) {
      this.errorMessage = 'Todavia no hay acceso facial registrado en este dispositivo.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      const imageBase64 = await this.faceRecognitionService.captureFaceBase64();
      const response = await firstValueFrom(this.faceRecognitionService.loginFace(imageBase64));
      await this.handleFaceSuccess(response);
    } catch (error: any) {
      this.errorMessage =
        error?.error?.detail || 'No fue posible iniciar sesion con reconocimiento facial.';
      this.isSubmitting = false;
    }
  }

  async submit(form: NgForm, event?: SubmitEvent) {
    const formEl = event?.target instanceof HTMLFormElement ? event.target : null;
    const submittedData = formEl ? new FormData(formEl) : null;

    this.credentials = {
      name: (submittedData?.get('name')?.toString() ?? this.credentials.name).trim(),
      email: (submittedData?.get('email')?.toString() ?? this.credentials.email).trim(),
      password: submittedData?.get('password')?.toString() ?? this.credentials.password,
    };

    this.submitted = true;
    const isDomValid = formEl?.checkValidity() ?? false;
    if (!form.valid && !isDomValid) {
      formEl?.reportValidity();
      this.errorMessage = 'Revisa los datos del formulario.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      const response = await firstValueFrom(
        this.isLoginMode
          ? this.apiService.loginUser({
              email: this.credentials.email,
              password: this.credentials.password,
            })
          : this.apiService.registerUser({
              name: this.credentials.name,
              email: this.credentials.email,
              password: this.credentials.password,
            })
      );

      await this.handleSuccess(response, this.credentials.email);
    } catch (error: any) {
      this.errorMessage = error?.error?.detail || 'Error en la conexion.';
      this.isSubmitting = false;
    }
  }

  private async refreshBiometricState() {
    const availability = await this.nativeBiometricService.getAvailability();

    this.biometricLabel = this.nativeBiometricService.getBiometryLabel(availability?.biometryType);
    this.biometricLoginEnabled =
      !!availability?.isAvailable && (await this.nativeBiometricService.hasStoredCredentials());
  }

  private async refreshFaceStatus() {
    this.faceLoginAvailable = false;

    if (!this.faceRecognitionService.isNativeRuntime()) {
      return;
    }

    const lastUserId = this.sessionService.getLastUserId();
    if (!lastUserId) {
      return;
    }

    try {
      const status = await firstValueFrom(this.faceRecognitionService.getStatus(lastUserId));
      this.faceLoginAvailable = !!status?.has_face;
    } catch {
      this.faceLoginAvailable = false;
    }
  }

  private async bindBiometryListener() {
    const handle = await this.nativeBiometricService.addBiometryChangeListener(() => {
      void this.refreshBiometricState();
    });

    this.destroyRef.onDestroy(() => {
      void handle?.remove();
    });
  }

  private async handleSuccess(response: SessionPayload, fallbackEmail: string) {
    this.isSubmitting = false;

    if (!this.isLoginMode) {
      this.mode = 'login';
      this.showPassword = false;
      this.credentials.password = '';
      this.submitted = false;
      this.errorMessage = 'Registro exitoso. Ahora inicia sesion.';
      return;
    }

    this.sessionService.createSession(response, fallbackEmail);
    await this.refreshBiometricState();
    await this.router.navigateByUrl('/tabs/tab1', { replaceUrl: true });
  }

  private async handleFaceSuccess(response: FaceLoginResponse) {
    this.isSubmitting = false;
    this.sessionService.createSession(response, response.email || '');
    await this.refreshBiometricState();
    await this.router.navigateByUrl('/tabs/tab1', { replaceUrl: true });
  }
}
