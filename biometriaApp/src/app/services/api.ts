import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // CORRECCIÓN: Usamos tu IP de ipconfig para que el celular físico encuentre la laptop
  private url = 'http://192.168.18.15:5000';

  constructor(private http: HttpClient) { }

  getProducts(query: string): Observable<any> {
    return this.http.get(`${this.url}/recommendations/?query=${query}&limit=20`);
  }

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