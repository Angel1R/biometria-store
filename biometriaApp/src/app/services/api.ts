import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // API URL defined in environment.ts
  private readonly url = environment.apiUrl;

  constructor(private http: HttpClient) { }

  /**
   * Get general products (Search)
   */
  getProducts(query: string): Observable<any> {
    return this.http.get(`${this.url}/recommendations/?query=${query}&limit=20`);
  }

  /**
   * Get personalized AI recommendations
   * A timestamp is added to force Android to ignore the cache.
   */
  getUserRecommendations(userId: string): Observable<any> {
    const antiCache = new Date().getTime();
    return this.http.get(`${this.url}/recommendations/user/${userId}?t=${antiCache}`);
  }

  /**
   * Traditional registration and login
   */
  registerUser(data: any): Observable<any> {
    return this.http.post(`${this.url}/auth/register`, data);
  }

  loginUser(data: any): Observable<any> {
    return this.http.post(`${this.url}/auth/login`, data);
  }

  /**
   * Register interactions (view, like, cart, purchase)
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
   * Get user likes: Retrieve likes from the database so that red hearts persist when refreshing
   */
  getUserLikes(userId: string): Observable<any> {
    return this.http.get(`${this.url}/interact/${userId}/likes`);
  }

  // ======================================================
  // Facial biometry methods (For Tab 3)
  // ======================================================

  /**
   * Register user face (Base64)
   */
  registerUserFace(data: { user_id: string, image_base64: string }): Observable<any> {
    return this.http.post(`${this.url}/auth/face/register`, data);
  }

  /**
   * Login by comparing faces (Base64)
   */
  loginFace(data: { image_base64: string }): Observable<any> {
    return this.http.post(`${this.url}/auth/face/login`, data);
  }

  /**
   * Check if user already has a face registered
   */
  getStatus(userId: string): Observable<any> {
    return this.http.get(`${this.url}/auth/face/status/${userId}`);
  }

  /**
   * Delete user face registration
   */
  deleteFace(userId: string): Observable<any> {
    return this.http.delete(`${this.url}/auth/face/${userId}`);
  }
}
