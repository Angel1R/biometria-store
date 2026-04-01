import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import {
  Camera,
  CameraDirection,
  CameraResultType,
  CameraSource,
} from '@capacitor/camera';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface FaceStatusResponse {
  user_id: string;
  has_face: boolean;
  updated_at?: string | null;
}

export interface FaceLoginResponse {
  mensaje: string;
  user_id: string;
  name: string;
  email: string;
  similitud?: number;
}

@Injectable({
  providedIn: 'root',
})
export class FaceRecognitionService {
  private readonly url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  isNativeRuntime() {
    return Capacitor.isNativePlatform();
  }

  async captureFaceBase64() {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera,
      direction: CameraDirection.Front,
      quality: 85,
      saveToGallery: false,
    });

    if (!photo.base64String) {
      throw new Error('No se obtuvo imagen desde la camara.');
    }

    return photo.base64String;
  }

  registerFace(userId: string, imageBase64: string): Observable<{ mensaje: string; user_id: string }> {
    return this.http.post<{ mensaje: string; user_id: string }>(`${this.url}/auth/face/register`, {
      user_id: userId,
      image_base64: imageBase64,
    });
  }

  loginFace(imageBase64: string): Observable<FaceLoginResponse> {
    return this.http.post<FaceLoginResponse>(`${this.url}/auth/face/login`, {
      image_base64: imageBase64,
    });
  }

  getStatus(userId: string): Observable<FaceStatusResponse> {
    return this.http.get<FaceStatusResponse>(`${this.url}/auth/face/status/${userId}`);
  }

  deleteFace(userId: string): Observable<{ mensaje: string; user_id: string }> {
    return this.http.delete<{ mensaje: string; user_id: string }>(`${this.url}/auth/face/${userId}`);
  }
}
