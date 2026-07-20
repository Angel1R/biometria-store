import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonGrid, IonRow, IonCol, 
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, 
  IonButton, IonIcon, IonBadge, IonSearchbar, IonModal, IonSkeletonText,
  IonInfiniteScroll, IonInfiniteScrollContent, IonRefresher, IonRefresherContent
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
    IonModal, IonInfiniteScroll, IonInfiniteScrollContent, IonRefresher, IonRefresherContent
  ]
})
export class Tab1Page implements OnInit, OnDestroy {
  private cartService = inject(CartService);
  private api = inject(ApiService);

  // Use Signals for modern reactive state management
  productos = signal<any[]>([]);
  recomendados = signal<any[]>([]);
  isLoading = signal<boolean>(false);
  
  likedProducts = new Set<number>(); 
  userId: string = '';
  productoSeleccionado = signal<any>(null);
  modalAbierto = signal<boolean>(false);
  modalTransition = false;
  ultimaCategoriaMostrada = '';
  private refreshRecommendationTimers: number[] = [];

  // Categories for organic effect
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

    this.cargarProductos(this.obtenerCategoriaAzarDiferente());
    this.cargarRecomendados();
  }

  ionViewWillEnter() {
    if (this.userId) this.cargarRecomendados();
  }

  ngOnDestroy() {
    this.limpiarTemporizadoresRecomendados();
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

  obtenerCategoriaAzarDiferente(): string {
    if (this.categoriasRandom.length <= 1) {
      const unicaCategoria = this.categoriasRandom[0] || 'tecnología';
      this.ultimaCategoriaMostrada = unicaCategoria;
      return unicaCategoria;
    }

    let nuevaCategoria = this.obtenerCategoriaAzar();
    while (nuevaCategoria === this.ultimaCategoriaMostrada) {
      nuevaCategoria = this.obtenerCategoriaAzar();
    }

    this.ultimaCategoriaMostrada = nuevaCategoria;
    return nuevaCategoria;
  }

  cargarProductos(busqueda: string | null | undefined, esInfiniteScroll: boolean = false, event?: any) {
    if (!busqueda || !busqueda.trim()) busqueda = this.obtenerCategoriaAzarDiferente();

    if (!esInfiniteScroll) this.isLoading.set(true);

    this.api.getProducts(busqueda).subscribe({
      next: (res: any) => {
        if (esInfiniteScroll) {
          // If it's scroll, concatenate to current signal
          this.productos.update(prods => [...prods, ...res.resultados]);
          if (event) event.target.complete();
        } else {
          this.productos.set(res.resultados);
        }

        if (event) event.target.complete();
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error(err);
        this.isLoading.set(false);
        if (event) event.target.complete();
      }
    });
  }

  // Infinite Scroll
  cargarMasProductos(event: any) {
    // When scrolling, search for another random category to give a sense of organic discovery
    this.cargarProductos(this.obtenerCategoriaAzarDiferente(), true, event);
  }

  refrescarTienda(event: any) {
    this.cargarProductos(this.obtenerCategoriaAzarDiferente(), false, event);
    this.cargarRecomendados();
  }

  cargarRecomendados() {
    this.api.getUserRecommendations(this.userId).subscribe({
      next: (res: any) => this.recomendados.set(res.recomendaciones || []),
      error: (err: any) => console.error(err)
    });
  }

  actualizarRecomendadosConReintento() {
    // Trigger immediately and then two short retries to capture
    // backend changes that may take a moment after a "like".
    this.cargarRecomendados();
    this.limpiarTemporizadoresRecomendados();

    const delays = [600, 1400];
    delays.forEach((delay) => {
      const timerId = window.setTimeout(() => this.cargarRecomendados(), delay);
      this.refreshRecommendationTimers.push(timerId);
    });
  }

  limpiarTemporizadoresRecomendados() {
    this.refreshRecommendationTimers.forEach((timerId) => window.clearTimeout(timerId));
    this.refreshRecommendationTimers = [];
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
      this.actualizarRecomendadosConReintento();
      this.api.registerInteraction(this.userId, productoId, 'like').subscribe({
        next: () => this.actualizarRecomendadosConReintento(),
        error: (err: any) => console.error(err)
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
