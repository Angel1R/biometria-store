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

  getProducts(query: string): Observable<any> {
    return this.http.get(`${this.url}/recommendations/?query=${query}&limit=20`);
  }

  // ✅ NOMBRE CORRECTO
  getUserRecommendations(userId: string): Observable<any> {
    return this.http.get(`${this.url}/recommendations/user/${userId}`);
  }

  registerUser(data: any): Observable<any> {
    return this.http.post(`${this.url}/auth/register`, data);
  }

  loginUser(data: any): Observable<any> {
    return this.http.post(`${this.url}/auth/login`, data);
  }

  registerInteraction(userId: string, productId: number, type: string): Observable<any> {
    const payload = {
      user_id: userId,
      product_id: productId,
      interaction_type: type
    };
    return this.http.post(`${this.url}/interact/`, payload);
  }
}