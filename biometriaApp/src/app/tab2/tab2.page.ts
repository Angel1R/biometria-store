import { Component, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastController } from '@ionic/angular';
import {
  IonButton,
  IonCol,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonModal,
  IonRow,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addCircleOutline,
  cartOutline,
  cardOutline,
  checkmarkCircleOutline,
  lockClosedOutline,
  personOutline,
  removeCircleOutline,
  trashOutline,
} from 'ionicons/icons';
import { CartService } from '../services/cart.service';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CurrencyPipe,
    IonButton,
    IonCol,
    IonContent,
    IonFooter,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonModal,
    IonRow,
    IonTitle,
    IonToolbar,
  ],
})
export class Tab2Page {
  public cartService = inject(CartService);
  isPayModalOpen = false;

  datosTarjeta = {
    nombre: '',
    numero: '',
    expiracion: '',
    cvv: '',
    nip: '',
  };

  constructor(private toastController: ToastController) {
    addIcons({
      trashOutline,
      addCircleOutline,
      removeCircleOutline,
      cartOutline,
      cardOutline,
      checkmarkCircleOutline,
      lockClosedOutline,
      personOutline,
    });
  }

  get esInvalido(): boolean {
    return (
      !this.datosTarjeta.nombre.trim() ||
      !this.datosTarjeta.numero ||
      !this.datosTarjeta.expiracion.trim() ||
      this.datosTarjeta.cvv.length < 3 ||
      this.datosTarjeta.nip.length < 4
    );
  }

  setOpenPayModal(isOpen: boolean) {
    this.isPayModalOpen = isOpen;
  }

  async finalizarPago() {
    this.setOpenPayModal(false);

    const toast = await this.toastController.create({
      message: 'Pago procesado con exito.',
      duration: 2500,
      color: 'success',
      icon: 'checkmark-circle-outline',
      position: 'middle',
    });
    await toast.present();

    this.datosTarjeta = {
      nombre: '',
      numero: '',
      expiracion: '',
      cvv: '',
      nip: '',
    };
    this.cartService.cartItems.set([]);
  }

  addMore(item: any) {
    this.cartService.addToCart(item);
  }

  decrease(item: any) {
    this.cartService.decreaseQuantity(item.id);
  }

  remove(item: any) {
    this.cartService.removeFromCart(item.id);
  }
}
