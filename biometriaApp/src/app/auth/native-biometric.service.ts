import { Injectable } from '@angular/core';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import {
  AccessControl,
  BiometryType,
  NativeBiometric,
  type AvailableResult,
} from '@capgo/capacitor-native-biometric';

@Injectable({
  providedIn: 'root',
})
export class NativeBiometricService {
  private readonly serverKey = 'biometria-store-mobile';
  private readonly faceServerKey = 'biometria-store-mobile-face';

  isNativeRuntime() {
    return Capacitor.isNativePlatform();
  }

  async getAvailability(): Promise<AvailableResult | null> {
    if (!this.isNativeRuntime()) {
      return null;
    }

    try {
      return await NativeBiometric.isAvailable();
    } catch {
      return null;
    }
  }

  async hasStoredCredentials() {
    return this.hasCredentials(this.serverKey);
  }

  async hasFaceStoredCredentials() {
    return this.hasCredentials(this.faceServerKey);
  }

  async registerCredentials(username: string, password: string) {
    this.ensureNativeRuntime();

    await this.verifyIdentity({
      reason: 'Registrar acceso biometrico al dispositivo',
      title: 'Activar biometria',
      subtitle: 'Protege tu acceso con rostro o huella',
      description: 'Confirma tu identidad para guardar el acceso seguro',
    });

    await NativeBiometric.setCredentials({
      username,
      password,
      server: this.serverKey,
      accessControl: AccessControl.BIOMETRY_ANY,
    });
  }

  async registerFaceCredentials(username: string, password: string) {
    if (!this.isNativeRuntime()) {
      return;
    }

    this.ensureNativeRuntime();

    // Guardamos un acceso facial separado porque el plugin solo permite filtrar "rostro" en verifyIdentity().
    await this.verifyIdentity({
      reason: 'Registrar acceso facial al dispositivo',
      title: 'Activar acceso facial',
      subtitle: 'Protege tu acceso con tu rostro',
      description: 'Confirma tu identidad facial para guardar el acceso rapido',
      negativeButtonText: 'Cancelar',
    }, true);

    await NativeBiometric.setCredentials({
      username,
      password,
      server: this.faceServerKey,
    });
  }

  async authenticateAndGetCredentials() {
    this.ensureNativeRuntime();

    return NativeBiometric.getSecureCredentials({
      server: this.serverKey,
      reason: 'Inicia sesion con biometria nativa',
      title: 'Acceso biometrico',
      subtitle: 'Confirma tu identidad',
      description: 'Usa el rostro o biometria disponible en tu dispositivo',
      negativeButtonText: 'Cancelar',
    });
  }

  async authenticateAndGetFaceCredentials() {
    this.ensureNativeRuntime();

    await this.verifyIdentity(
      {
        reason: 'Inicia sesion con acceso facial',
        title: 'Acceso facial',
        subtitle: 'Confirma tu rostro',
        description: 'Usa el reconocimiento facial disponible en tu dispositivo',
        negativeButtonText: 'Cancelar',
      },
      true
    );

    return NativeBiometric.getCredentials({
      server: this.faceServerKey,
    });
  }

  async clearStoredCredentials() {
    if (!this.isNativeRuntime()) {
      return;
    }

    await Promise.all([
      this.deleteCredentials(this.serverKey),
      this.deleteCredentials(this.faceServerKey),
    ]);
  }

  async addBiometryChangeListener(
    listener: (result: AvailableResult) => void
  ): Promise<PluginListenerHandle | null> {
    if (!this.isNativeRuntime()) {
      return null;
    }

    try {
      return await NativeBiometric.addListener('biometryChange', listener);
    } catch {
      return null;
    }
  }

  getBiometryLabel(type: BiometryType | null | undefined) {
    switch (type) {
      case BiometryType.FACE_ID:
        return 'Face ID';
      case BiometryType.FACE_AUTHENTICATION:
        return 'reconocimiento facial';
      case BiometryType.FINGERPRINT:
        return 'huella digital';
      case BiometryType.TOUCH_ID:
        return 'Touch ID';
      case BiometryType.IRIS_AUTHENTICATION:
        return 'iris';
      case BiometryType.MULTIPLE:
        return 'biometria del dispositivo';
      default:
        return 'biometria nativa';
    }
  }

  isFaceBiometry(type: BiometryType | null | undefined) {
    return (
      type === BiometryType.FACE_ID ||
      type === BiometryType.FACE_AUTHENTICATION ||
      type === BiometryType.MULTIPLE
    );
  }

  private async hasCredentials(server: string) {
    if (!this.isNativeRuntime()) {
      return false;
    }

    try {
      const result = await NativeBiometric.isCredentialsSaved({
        server,
      });
      return result.isSaved;
    } catch {
      return false;
    }
  }

  private async deleteCredentials(server: string) {
    try {
      await NativeBiometric.deleteCredentials({
        server,
      });
    } catch {
      // No lanzamos error si ya no hay credenciales guardadas.
    }
  }

  private async verifyIdentity(
    options: {
      reason: string;
      title: string;
      subtitle: string;
      description: string;
      negativeButtonText?: string;
    },
    faceOnly = false
  ) {
    const allowedBiometryTypes =
      faceOnly && Capacitor.getPlatform() === 'android'
        ? [BiometryType.FACE_AUTHENTICATION]
        : undefined;

    await NativeBiometric.verifyIdentity({
      ...options,
      allowedBiometryTypes,
    });
  }

  private ensureNativeRuntime() {
    if (!this.isNativeRuntime()) {
      throw new Error('La biometria nativa solo esta disponible en la app movil.');
    }
  }
}
