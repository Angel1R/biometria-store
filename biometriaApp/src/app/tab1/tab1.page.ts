import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CurrencyPipe } from '@angular/common'; 
import { ApiService } from '../services/api';
import { addIcons } from 'ionicons';
import { heart, heartOutline, cubeOutline, sparkles, cartOutline } from 'ionicons/icons';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [IonicModule, CurrencyPipe], 
})
export class Tab1Page implements OnInit {
  productos: any[] = [];
  
  // Memoria dinámica para los corazones que presiona el usuario
  likedProducts = new Set<number>(); 
  
  // La variable del usuario ahora arranca vacía, se llenará dinámicamente
  userId: string = ''; 

  // Nuevas variables para el Modal de Detalle
  productoSeleccionado: any = null;
  modalAbierto: boolean = false;

  constructor(private api: ApiService) {
    addIcons({ heart, heartOutline, cubeOutline, sparkles, cartOutline });
  }

  modalTransition = false;
  reopenDelay = 250;

  ngOnInit() {
    this.obtenerUsuarioActual(); // 1. Identificamos quién está usando la app
    this.cargarProductos('tecnología'); // 2. Le cargamos sus productos
  }

  // --- LÓGICA DE USUARIOS DINÁMICOS ---
  obtenerUsuarioActual() {
    // Buscamos si este celular/navegador ya tiene una sesión iniciada
    let idGuardado = localStorage.getItem('biometria_user_id');
    
    if (idGuardado) {
      this.userId = idGuardado; // Ya lo conocemos
    } else {
      // Como respaldo, pero ahora con el login real no debería pasar por aquí.
      this.userId = 'user_' + Math.random().toString(36).substring(2, 10);
    }
    console.log('👤 Sesión activa para el usuario:', this.userId);
  }

  // --- LÓGICA DE BÚSQUEDA ---
  cargarProductos(busqueda: string | null | undefined) {
    if (!busqueda || !busqueda.trim()) return;

    this.api.getProducts(busqueda).subscribe({
      next: (res) => {
        this.productos = res.resultados;
        console.log('👀 Datos completos de un producto:', this.productos[0]);
      },
      error: (err) => console.error('Error cargando productos', err)
    });
  }

  // Función para abrir el detalle
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

  // Función para cerrar el detalle
  cerrarDetalle() {
    if (this.modalTransition) return;

    this.modalTransition = true;
    this.modalAbierto = false;

    setTimeout(() => {
      this.productoSeleccionado = null;

      setTimeout(() => {
        this.modalTransition = false;
      }, 150);
    }, 200);
  }

  // Convertimos el score de la IA (0.64) a porcentaje (64%)
  obtenerPorcentajeMatch(score: number): number {
    return Math.round(score * 100);
  }

  // Actualizamos el toggleLike para evitar que abra el modal
  toggleLike(productoId: number, event: Event) {
    event.stopPropagation(); // <--- ESTO ES CLAVE para no abrir el modal al dar like
    
    if (this.likedProducts.has(productoId)) {
      this.likedProducts.delete(productoId);
    } else {
      this.likedProducts.add(productoId);
      this.api.registerInteraction(this.userId, productoId, 'view').subscribe();
    }
  }
}