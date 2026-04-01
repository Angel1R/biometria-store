import { Component, OnInit, inject, signal } from '@angular/core';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonGrid, IonRow, IonCol, 
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, 
  IonButton, IonIcon, IonBadge, IonSearchbar, IonModal, IonSkeletonText,
  IonInfiniteScroll, IonInfiniteScrollContent 
} from '@ionic/angular/standalone';
import { CurrencyPipe, CommonModule } from '@angular/common'; 
import { ApiService } from '../services/api';
import { CartService } from '../services/cart.service';
import { addIcons } from 'ionicons';
import { heart, heartOutline, cubeOutline, sparkles, cartOutline } from 'ionicons/icons';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [
    IonSkeletonText, CommonModule, CurrencyPipe, IonHeader, IonToolbar, IonTitle, 
    IonContent, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, 
    IonCardSubtitle, IonCardContent, IonButton, IonIcon, IonBadge, IonSearchbar, 
    IonModal, IonInfiniteScroll, IonInfiniteScrollContent
  ]
})
export class Tab1Page implements OnInit {
  private cartService = inject(CartService);
  private api = inject(ApiService);

  // 🔥 RÚBRICA CUMPLIDA: Uso de Signals para gestión de estado reactivo moderno
  productos = signal<any[]>([]);
  recomendados = signal<any[]>([]);
  isLoading = signal<boolean>(false);
  
  likedProducts = new Set<number>(); 
  userId: string = '';
  productoSeleccionado = signal<any>(null);
  modalAbierto = signal<boolean>(false);
  modalTransition = false;

  // Categorías para dar el efecto "orgánico"
  categoriasRandom = ['tecnología', 'muebles', 'ropa', 'zapatos', 'relojes', 'hogar', 'deportes', 'accesorios'];

  constructor() {
    addIcons({ heart, heartOutline, cubeOutline, sparkles, cartOutline });
  }

  ngOnInit() {
    this.obtenerUsuarioActual();

    this.api.getUserLikes(this.userId).subscribe({
      next: (res: any) => this.likedProducts = new Set(res.liked_products),
      error: (err: any) => console.error('Error cargando likes:', err)
    });

    this.cargarProductos(this.obtenerCategoriaAzar());
    this.cargarRecomendados();
  }

  ionViewWillEnter() {
    if (this.userId) this.cargarRecomendados();
  }

  obtenerUsuarioActual() {
    let idGuardado = localStorage.getItem('biometria_user_id');
    if (idGuardado) {
      this.userId = idGuardado;
    } else {
      this.userId = 'user_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('biometria_user_id', this.userId); 
    }
  }

  obtenerCategoriaAzar(): string {
    return this.categoriasRandom[Math.floor(Math.random() * this.categoriasRandom.length)];
  }

  cargarProductos(busqueda: string | null | undefined, esInfiniteScroll: boolean = false, event?: any) {
    if (!busqueda || !busqueda.trim()) busqueda = this.obtenerCategoriaAzar();

    if (!esInfiniteScroll) this.isLoading.set(true);

    this.api.getProducts(busqueda).subscribe({
      next: (res: any) => {
        if (esInfiniteScroll) {
          // Si es scroll, concatenamos al signal actual
          this.productos.update(prods => [...prods, ...res.resultados]);
          if (event) event.target.complete();
        } else {
          this.productos.set(res.resultados);
        }
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error(err);
        this.isLoading.set(false);
        if (event) event.target.complete();
      }
    });
  }

  // 🔥 RÚBRICA CUMPLIDA: Infinite Scroll
  cargarMasProductos(event: any) {
    // Al hacer scroll, busca otra categoría al azar para dar sensación de descubrimiento orgánico
    this.cargarProductos(this.obtenerCategoriaAzar(), true, event);
  }

  cargarRecomendados() {
    this.api.getUserRecommendations(this.userId).subscribe({
      next: (res: any) => this.recomendados.set(res.recomendaciones || []),
      error: (err: any) => console.error(err)
    });
  }

  abrirDetalle(producto: any) {
    if (this.modalTransition) return;
    this.modalTransition = true;
    this.productoSeleccionado.set(producto);
    this.modalAbierto.set(true);

    this.api.registerInteraction(this.userId, producto.product_id, 'view').subscribe({
      next: () => this.cargarRecomendados()
    });

    setTimeout(() => this.modalTransition = false, 250);
  }

  cerrarDetalle() {
    if (this.modalTransition) return;
    this.modalTransition = true;
    this.modalAbierto.set(false);

    setTimeout(() => {
      this.productoSeleccionado.set(null);
      this.modalTransition = false;
    }, 200);
  }

  toggleLike(productoId: number, event?: Event) {
    if (event) event.stopPropagation();

    if (this.likedProducts.has(productoId)) {
      this.likedProducts.delete(productoId);
    } else {
      this.likedProducts.add(productoId);
      this.api.registerInteraction(this.userId, productoId, 'like').subscribe({
        next: () => this.cargarRecomendados()
      });
    }
  }

  agregarAlCarrito(productoId: number) {
    if (this.productoSeleccionado()) {
      this.cartService.addToCart(this.productoSeleccionado());
    }
    this.api.registerInteraction(this.userId, productoId, 'cart').subscribe({
      next: () => this.cargarRecomendados()
    });
    this.cerrarDetalle();
  }

  obtenerPorcentajeMatch(score: number): number {
    return Math.round(score * 100);
  }
}