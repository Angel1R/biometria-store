---
title: Biometria Backend
emoji: 🏃
colorFrom: blue
colorTo: red
sdk: docker
pinned: false
---

# Biometria Store

Proyecto móvil con:
1. Frontend en Ionic 8 + Angular Standalone + Capacitor.
2. Backend en FastAPI (Python) con funcionalidades de recomendación y biometría.

## Estructura del proyecto

1. backend: API en FastAPI.
2. biometriaApp: app móvil/web en Ionic + Capacitor.
3. Dockerfile: imagen para desplegar backend (por ejemplo en Hugging Face Spaces).

## Requisitos previos

1. Node.js 20+ y npm.
2. Python 3.10+.
3. Git.
4. Para Android: Android Studio + Android SDK + Java (JDK 17 o superior).

## 1) Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd biometria-store
```

## 2) Levantar backend en local (sin Docker)

Desde la raíz del proyecto:

```bash
cd backend
python -m venv .venv
```

Activar entorno virtual:

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Linux/macOS:

```bash
source .venv/bin/activate
```

Instalar dependencias y ejecutar API:

```bash
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## 3) Levantar backend con Docker (opcional)

Desde la raíz del proyecto:

```bash
docker build -t biometria-backend .
docker run --rm -p 7860:7860 biometria-backend
```

Nota:
1. El contenedor expone el backend en el puerto 7860.
2. Esta configuración es la usada para despliegue tipo Hugging Face Space (Docker SDK).

## 4) Instalar y ejecutar frontend (Ionic)

```bash
cd biometriaApp
npm install
ionic serve
```

Esto levanta la app en modo web para desarrollo local.

## 5) Configurar URL del backend

Archivos:
1. biometriaApp/src/environments/environment.ts
2. biometriaApp/src/environments/environment.prod.ts

Ajusta apiUrl según tu caso:
1. Backend en la nube: deja la URL remota.
2. Backend local + celular físico: usa la IP local de tu PC (ejemplo http://192.168.1.50:8000).
3. Backend local + emulador Android: usa http://10.0.2.2:8000.

## 6) Ejecutar app en Android (Capacitor)

```bash
cd biometriaApp
ionic build
npx cap sync android
npx cap run android
```

Si la carpeta android está dañada o falta gradlew/gradlew.bat:

```bash
cd biometriaApp
rm -rf android
npx cap add android
npx cap sync android
```

En Windows, si aparece error de SDK location, crea o revisa:

archivo:
1. biometriaApp/android/local.properties

contenido de ejemplo:

```properties
sdk.dir=C\:\\Users\\TU_USUARIO\\AppData\\Local\\Android\\Sdk
```

## 7) Comandos útiles

Frontend (biometriaApp):

```bash
npm run build
npm run lint
npx cap sync android
```

Backend (backend):

```bash
uvicorn main:app --reload
```

## 8) Despliegue rápido a Hugging Face Space (Docker)

Ejemplo:

```bash
git add .
git commit -m "update backend"
git push huggingface main
```

Si rechaza push por non-fast-forward:

```bash
git pull huggingface main --rebase
git push huggingface main
```

## Licencia

Proyecto académico / demostrativo.
