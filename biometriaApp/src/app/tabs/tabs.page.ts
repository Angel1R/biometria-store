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
  // Inject the service so the shopping cart badge updates automatically
  public cartService = inject(CartService);

  constructor() {
    // IMPORTANT: Register icons so they don't appear empty
    addIcons({ storefrontOutline, cartOutline, shieldCheckmarkOutline });
  }
}
