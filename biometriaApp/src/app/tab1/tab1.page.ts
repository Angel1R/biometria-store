import { Component, OnInit } from '@angular/core';
import { 
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonBadge,
  IonSearchbar,
  IonModal, IonSkeletonText } from '@ionic/angular/standalone';import { CurrencyPipe, CommonModule } from '@angular/common'; 
import { ApiService } from '../services/api';
import { addIcons } from 'ionicons';
import { heart, heartOutline, cubeOutline, sparkles, cartOutline } from 'ionicons/icons';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [IonSkeletonText, 
    CommonModule,
    CurrencyPipe,

    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonBadge,
    IonSearchbar,
    IonModal
]})
export class Tab1Page implements OnInit {

  productos: any[] = [];
  recomendados: any[] = [];

  isLoading: boolean = false;

  likedProducts = new Set<number>(); 
  userId: string = '';

  productoSeleccionado: any = null;
  modalAbierto: boolean = false;

  constructor(private api: ApiService) {
    addIcons({ heart, heartOutline, cubeOutline, sparkles, cartOutline });
  }

  modalTransition = false;
  reopenDelay = 250;

  ngOnInit() {
    this.obtenerUsuarioActual();
    this.cargarProductos('tecnología');
    this.cargarRecomendados();
  }

  obtenerUsuarioActual() {
    let idGuardado = localStorage.getItem('biometria_user_id');
    
    if (idGuardado) {
      this.userId = idGuardado;
    } else {
      this.userId = 'user_' + Math.random().toString(36).substring(2, 10);
    }

    console.log('👤 Usuario:', this.userId);
  }

  cargarProductos(busqueda: string | null | undefined) {
    if (!busqueda || !busqueda.trim()) {
      busqueda = 'tecnología';
    }

    this.isLoading = true;

    this.api.getProducts(busqueda).subscribe({
      next: (res: any) => {
        this.productos = res.resultados;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  cargarRecomendados() {
    this.api.getUserRecommendations(this.userId).subscribe({
      next: (res: any) => {
        this.recomendados = res.recomendaciones || [];
      },
      error: (err: any) => console.error(err)
    });
  }

  abrirDetalle(producto: any) {
    if (this.modalTransition) return;

    this.modalTransition = true;
    this.productoSeleccionado = producto;
    this.modalAbierto = true;

    this.api.registerInteraction(this.userId, producto.product_id, 'view').subscribe();

    setTimeout(() => {
      this.modalTransition = false;
    }, this.reopenDelay);
  }

  cerrarDetalle() {
    if (this.modalTransition) return;

    this.modalTransition = true;
    this.modalAbierto = false;

    setTimeout(() => {
      this.productoSeleccionado = null;
      this.modalTransition = false;
    }, 200);
  }

  toggleLike(productoId: number, event?: Event) {
    if (event) event.stopPropagation();

    if (this.likedProducts.has(productoId)) {
      this.likedProducts.delete(productoId);
    } else {
      this.likedProducts.add(productoId);

      // 🔥 IMPORTANTE
      this.api.registerInteraction(this.userId, productoId, 'like').subscribe();

      // refrescar recomendaciones
      this.cargarRecomendados();
    }
  }

  agregarAlCarrito(productoId: number) {
    this.api.registerInteraction(this.userId, productoId, 'cart').subscribe();
    this.cerrarDetalle();
  }

  obtenerPorcentajeMatch(score: number): number {
    return Math.round(score * 100);
  }
}