import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'biometriaApp',
  webDir: 'www',
  server: {
    cleartext: true
  }
};

export default config;
