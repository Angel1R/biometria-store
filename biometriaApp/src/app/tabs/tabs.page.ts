import { Component, inject } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonBadge } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { storefrontOutline, cartOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { CartService } from '../services/cart.service';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: true,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonBadge],
})
export class TabsPage {
  // Inyectamos el servicio para que el Badge del carrito se actualice solo
  public cartService = inject(CartService);

  constructor() {
    // 🔥 IMPORTANTE: Registrar los iconos para que no salgan vacíos
    addIcons({ storefrontOutline, cartOutline, shieldCheckmarkOutline });
  }
}