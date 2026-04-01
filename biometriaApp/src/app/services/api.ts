import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // 🔥 Usamos la URL de Hugging Face definida en environment.ts
  private readonly url = environment.apiUrl;

  constructor(private http: HttpClient) { }

  /**
   * Obtener productos generales (Búsqueda)
   */
  getProducts(query: string): Observable<any> {
    return this.http.get(`${this.url}/recommendations/?query=${query}&limit=20`);
  }

  /**
   * Obtener recomendaciones personalizadas de la IA
   * Se agrega un timestamp para obligar a Android a ignorar la caché.
   */
  getUserRecommendations(userId: string): Observable<any> {
    const antiCache = new Date().getTime();
    return this.http.get(`${this.url}/recommendations/user/${userId}?t=${antiCache}`);
  }

  /**
   * Registro y Login tradicional
   */
  registerUser(data: any): Observable<any> {
    return this.http.post(`${this.url}/auth/register`, data);
  }

  loginUser(data: any): Observable<any> {
    return this.http.post(`${this.url}/auth/login`, data);
  }

  /**
   * Registrar interacciones (view, like, cart, purchase)
   */
  registerInteraction(userId: string, productId: number, type: string): Observable<any> {
    const payload = {
      user_id: userId,
      product_id: productId,
      interaction_type: type
    };
    return this.http.post(`${this.url}/interact/`, payload);
  }

  /**
   * 🔥 RECUPERAR LIKES: Para que los corazones rojos persistan al refrescar
   */
  getUserLikes(userId: string): Observable<any> {
    return this.http.get(`${this.url}/interact/${userId}/likes`);
  }

  // ======================================================
  // 🔥 MÉTODOS DE BIOMETRÍA FACIAL (Para Tab 3)
  // ======================================================

  /**
   * Registrar el rostro de un usuario (Base64)
   */
  registerUserFace(data: { user_id: string, image_base64: string }): Observable<any> {
    return this.http.post(`${this.url}/auth/face/register`, data);
  }

  /**
   * Iniciar sesión comparando rostro (Base64)
   */
  loginFace(data: { image_base64: string }): Observable<any> {
    return this.http.post(`${this.url}/auth/face/login`, data);
  }

  /**
   * Verificar si el usuario ya tiene un rostro registrado
   */
  getStatus(userId: string): Observable<any> {
    return this.http.get(`${this.url}/auth/face/status/${userId}`);
  }

  /**
   * Eliminar el registro facial del usuario
   */
  deleteFace(userId: string): Observable<any> {
    return this.http.delete(`${this.url}/auth/face/${userId}`);
  }
}