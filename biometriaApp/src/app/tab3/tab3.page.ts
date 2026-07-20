import { Component, DestroyRef, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton, IonCard, IonCardContent, IonContent, IonHeader,
  IonIcon, IonSpinner, IonText, IonTitle, IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  eyeOffOutline, // Added for private mode
  fingerPrintOutline, lockClosedOutline, logOutOutline, mailOutline,
  personCircleOutline, shieldCheckmarkOutline, sparkles, trashOutline,
} from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';
import { Camera } from '@capacitor/camera';
import { Motion } from '@capacitor/motion';
import { PluginListenerHandle } from '@capacitor/core';

import { NativeBiometricService } from '../auth/native-biometric.service';
import { SessionService, type SessionUser } from '../auth/session.service';
import { ApiService } from '../services/api';
import { FaceRecognitionService } from '../services/face-recognition.service';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: true,
  imports: [
    FormsModule, IonButton, IonCard, IonCardContent, IonContent,
    IonHeader, IonIcon, IonSpinner, IonText, IonTitle, IonToolbar,
  ],
})
export class Tab3Page implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly apiService = inject(ApiService);
  private readonly sessionService = inject(SessionService);
  private readonly nativeBiometricService = inject(NativeBiometricService);
  private readonly faceRecognitionService = inject(FaceRecognitionService);

  // Modern reactive state management (SIGNALS)
  user = signal<SessionUser>({ userId: '', name: 'Usuario', email: '' });

  currentPassword = signal('');
  biometricAvailable = signal(false);
  biometricEnabled = signal(false);
  biometricLabel = signal('biometria nativa');
  isSavingBiometrics = signal(false);
  isLoggingOut = signal(false);
  biometricMessage = signal('');
  biometricMessageColor = signal<'success' | 'danger' | 'medium'>('medium');
  
  faceAvailable = signal(false);
  faceRegistered = signal(false);
  facePassword = signal('');
  isFaceProcessing = signal(false);
  faceMessage = signal('');
  faceMessageColor = signal<'success' | 'danger' | 'medium'>('medium');

  // --- PRIVATE MODE VARIABLES ---
  isPrivateMode = signal(false);
  private accelHandler?: PluginListenerHandle;
  private isCooldown = false;
  private privateModeTimeout?: any;

  // Computed reactive values
  registerButtonLabel = computed(() => `Registrar ${this.biometricLabel()}`);
  canRegisterBiometrics = computed(() => this.biometricAvailable() && !this.biometricEnabled());
  
  biometricStatusLabel = computed(() => {
    if (!this.biometricAvailable()) return 'No disponible';
    return this.biometricEnabled() ? 'Activo' : 'Disponible';
  });

  biometricSummary = computed(() => {
    if (!this.biometricAvailable()) return 'La biometria nativa solo estara disponible desde un dispositivo movil compatible.';
    if (this.biometricEnabled()) return `Tu acceso con ${this.biometricLabel()} ya esta listo. Puedes cerrar sesion y volver a entrar desde el login usando la biometria del dispositivo.`;
    return `Activa ${this.biometricLabel()} para entrar mas rapido despues de cerrar sesion.`;
  });

  faceStatusLabel = computed(() => {
    if (!this.faceAvailable()) return 'No disponible';
    return this.faceRegistered() ? 'Activo' : 'Disponible';
  });

  faceSummary = computed(() => {
    if (!this.faceAvailable()) return 'El reconocimiento facial solo estara disponible desde un dispositivo movil compatible.';
    if (this.faceRegistered()) return 'Tu acceso facial ya esta listo. Puedes cerrar sesion y volver a entrar desde el login usando tu rostro.';
    return 'Registra tu rostro para entrar mas rapido en el login.';
  });

  constructor() {
    addIcons({
      fingerPrintOutline, lockClosedOutline, logOutOutline, mailOutline,
      personCircleOutline, shieldCheckmarkOutline, sparkles, trashOutline,
      eyeOffOutline
    });
  }

  async ngOnInit() {
    await this.loadProfileState();
    await this.loadFaceState();
    await this.bindBiometryListener();
  }

  // Executed when page is fully visible
  async ionViewDidEnter() {
    await this.iniciarDetectorMovimiento();
  }

  // Executed just before leaving page
  async ionViewWillLeave() {
    await this.detenerDetectorMovimiento();
  }

  async ionViewWillEnter() {
    await this.loadProfileState();
    await this.loadFaceState();
  }

  // --- ACCELEROMETER LOGIC ---
  private async iniciarDetectorMovimiento() {
    try {
      if (typeof (DeviceMotionEvent as any)?.requestPermission === 'function') {
        const permissionState = await (DeviceMotionEvent as any).requestPermission();
        if (permissionState !== 'granted') return;
      }

      this.accelHandler = await Motion.addListener('accel', (event) => {
        const z = event.accelerationIncludingGravity.z || 0;

        if (z < -7 && !this.isPrivateMode() && !this.isCooldown) {
          this.activarModoPrivado();
        }
      });
    } catch (error) {
      console.warn('Accelerometer not available on this device', error);
    }
  }

  private async detenerDetectorMovimiento() {
    if (this.accelHandler) {
      await this.accelHandler.remove();
      this.accelHandler = undefined;
    }
    if (this.privateModeTimeout) {
      clearTimeout(this.privateModeTimeout);
    }
    this.isPrivateMode.set(false);
    this.isCooldown = false;
  }

  private activarModoPrivado() {
    this.isPrivateMode.set(true);
    console.log('Private Mode Activated');

    this.privateModeTimeout = setTimeout(() => {
      this.isPrivateMode.set(false);
      this.isCooldown = true;
      console.log('Private Mode Ended - Starting Cooldown');

      setTimeout(() => {
        this.isCooldown = false;
        console.log('Cooldown Ended - Ready to detect again');
      }, 3000);

    }, 7000);
  }

  async enableBiometrics() {
    const currentUser = this.user();
    if (!currentUser.email) {
      this.setBiometricMessage('No encontramos el correo de la sesion actual.', 'danger');
      return;
    }

    if (!this.currentPassword().trim()) {
      this.setBiometricMessage('Escribe tu contrasena actual para registrar la biometria.', 'danger');
      return;
    }

    this.isSavingBiometrics.set(true);
    this.biometricMessage.set('');

    try {
      await firstValueFrom(
        this.apiService.loginUser({
          email: currentUser.email,
          password: this.currentPassword(),
        })
      );

      await this.nativeBiometricService.registerCredentials(
        currentUser.email,
        this.currentPassword()
      );

      await this.loadProfileState();
      this.currentPassword.set('');
      this.setBiometricMessage(
        `Acceso con ${this.biometricLabel()} registrado correctamente. Ya puedes cerrar sesion y entrar con la biometria nativa.`,
        'success'
      );
    } catch (error: any) {
      this.setBiometricMessage(
        error?.error?.detail || 'No fue posible registrar la biometria en este dispositivo.',
        'danger'
      );
    } finally {
      this.isSavingBiometrics.set(false);
    }
  }

  async disableBiometrics() {
    this.isSavingBiometrics.set(true);
    this.biometricMessage.set('');

    try {
      await this.nativeBiometricService.clearStoredCredentials();
      await this.loadProfileState();
      this.currentPassword.set('');
      this.setBiometricMessage(
        'Se eliminaron los accesos biometricos guardados en este dispositivo.',
        'medium'
      );
    } catch {
      this.setBiometricMessage('No fue posible eliminar el acceso biometrico.', 'danger');
    } finally {
      this.isSavingBiometrics.set(false);
    }
  }

  async registerFaceAccess() {
    const currentUser = this.user();
    if (!currentUser.userId) {
      this.setFaceMessage('No encontramos el usuario de la sesion actual.', 'danger');
      return;
    }

    if (!currentUser.email) {
      this.setFaceMessage('No encontramos el correo de la sesion actual.', 'danger');
      return;
    }

    if (!this.facePassword().trim()) {
      this.setFaceMessage('Escribe tu contrasena actual para registrar el acceso facial.', 'danger');
      return;
    }

    this.isFaceProcessing.set(true);
    this.faceMessage.set('');

    try {
      // Check and request camera permissions
      const permissions = await Camera.checkPermissions();
      if (permissions.camera !== 'granted') {
        const request = await Camera.requestPermissions();
        if (request.camera !== 'granted') {
          this.setFaceMessage('Permiso de cámara denegado. Es obligatorio para la biometría.', 'danger');
          this.isFaceProcessing.set(false);
          return;
        }
      }

      await firstValueFrom(
        this.apiService.loginUser({
          email: currentUser.email,
          password: this.facePassword(),
        })
      );

      const imageBase64 = await this.faceRecognitionService.captureFaceBase64();
      
      await firstValueFrom(
        this.faceRecognitionService.registerFace(currentUser.userId, imageBase64)
      );

      this.faceRegistered.set(true);
      this.facePassword.set('');
      this.setFaceMessage(
        'Acceso facial registrado correctamente. Ya puedes entrar desde el login con tu rostro.',
        'success'
      );
    } catch (error: any) {
      this.setFaceMessage(
        error?.error?.detail || 'No fue posible registrar el acceso facial.',
        'danger'
      );
    } finally {
      this.isFaceProcessing.set(false);
    }
  }

  async removeFaceAccess() {
    const currentUser = this.user();
    if (!currentUser.userId) {
      this.setFaceMessage('No encontramos el usuario de la sesion actual.', 'danger');
      return;
    }

    this.isFaceProcessing.set(true);
    this.faceMessage.set('');

    try {
      await firstValueFrom(this.faceRecognitionService.deleteFace(currentUser.userId));
      this.faceRegistered.set(false);
      this.setFaceMessage('El acceso facial se elimino de tu cuenta.', 'medium');
    } catch (error: any) {
      this.setFaceMessage(
        error?.error?.detail || 'No fue posible eliminar el acceso facial.',
        'danger'
      );
    } finally {
      this.isFaceProcessing.set(false);
    }
  }

  async logout() {
    this.isLoggingOut.set(true);
    this.sessionService.clearSession();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
    this.isLoggingOut.set(false);
  }

  private async loadProfileState() {
    this.user.set(this.sessionService.getCurrentUser());

    const availability = await this.nativeBiometricService.getAvailability();
    this.biometricAvailable.set(!!availability?.isAvailable);
    this.biometricLabel.set(this.nativeBiometricService.getBiometryLabel(availability?.biometryType));
    
    const hasCredentials = await this.nativeBiometricService.hasStoredCredentials();
    this.biometricEnabled.set(this.biometricAvailable() && hasCredentials);
  }

  private async loadFaceState() {
    this.faceAvailable.set(this.faceRecognitionService.isNativeRuntime());
    const currentUser = this.user();

    if (!this.faceAvailable() || !currentUser.userId) {
      this.faceRegistered.set(false);
      return;
    }

    try {
      const status = await firstValueFrom(
        this.faceRecognitionService.getStatus(currentUser.userId)
      );
      this.faceRegistered.set(!!status?.has_face);
    } catch (error: any) {
      this.faceRegistered.set(false);
      this.setFaceMessage(
        error?.error?.detail || 'No fue posible validar el estado del acceso facial.',
        'danger'
      );
    }
  }

  private async bindBiometryListener() {
    const handle = await this.nativeBiometricService.addBiometryChangeListener(() => {
      void this.loadProfileState();
    });

    this.destroyRef.onDestroy(() => {
      void handle?.remove();
    });
  }

  private setBiometricMessage(message: string, color: 'success' | 'danger' | 'medium') {
    this.biometricMessage.set(message);
    this.biometricMessageColor.set(color);
  }

  private setFaceMessage(message: string, color: 'success' | 'danger' | 'medium') {
    this.faceMessage.set(message);
    this.faceMessageColor.set(color);
  }
}
