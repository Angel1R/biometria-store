import { Component } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor() {
    this.configurarStatusBar();
  }

  async configurarStatusBar() {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#FFFFFF' });
    } catch (error) {
      console.error('No se pudo configurar el status bar:', error);
    }
  }
}
