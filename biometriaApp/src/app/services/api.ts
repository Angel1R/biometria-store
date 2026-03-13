import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private url = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // Obtener productos buscando un término
  getProducts(query: string): Observable<any> {
    return this.http.get(`${this.url}/recommendations/?query=${query}&limit=20`);
  }

  // Obtener recomendaciones personalizadas
  getPersonalizedRecommendations(userId: string): Observable<any> {
    return this.http.get(`${this.url}/recommendations/user/${userId}`);
  }

  // Obtener sugerencias inteligentes
  getSuggestions(query: string, userId: string): Observable<any> {
    return this.http.get(
      `${this.url}/search-suggestions?query=${query}&user_id=${userId}`
    );
  }

  // Registrar interacción (El "Me gusta" o "Añadir al carrito")
  // 👇 AQUÍ ESTÁ EL CAMBIO: 'number' en lugar de 'int'
  registerInteraction(userId: string, productId: number, type: string): Observable<any> {
    const payload = {
      user_id: userId,
      product_id: productId,
      interaction_type: type // 'view', 'cart', 'purchase'
    };
    return this.http.post(`${this.url}/interact/`, payload);
  }
}