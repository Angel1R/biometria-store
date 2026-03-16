// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

// Intentar determinar la IP/Host desde la que se cargó la aplicación (aplica al Live Reload en celular)
const getApiUrl = () => {
  // Si estamos en la app real corriendo desde file:// (Android original sin live reload)
  if (window.location.protocol === 'file:' || window.location.protocol === 'capacitor:') {
    return 'http://192.168.1.76:8000'; // Fallback a tu IP usual si corres el APK nativo normal
  }
  
  // Si estamos en web o usando `ionic cap run android -l` (Live Reload)
  // window.location.hostname nos dará exactamente "localhost" o tu "192.x.x.x" dinámicamente!
  const host = window.location.hostname;
  return `http://${host}:8000`; 
};

export const environment = {
  production: false,
  apiUrl: getApiUrl()
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
