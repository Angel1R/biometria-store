FROM python:3.10-slim

# Directorio de trabajo
WORKDIR /app

# Paquetes necesarios para compilar dependencias nativas
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copiar el archivo de requerimientos
COPY backend/requirements.txt .

# Instalar dependencias 
# (el parámetro --no-cache-dir ayuda a que la imagen sea más ligera)
RUN pip install --no-cache-dir -r requirements.txt

# Copiar todo el código del backend
COPY backend/ .

# Hugging Face Spaces usa el puerto 7860 por defecto
EXPOSE 7860

# Comando para iniciar la aplicación
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
