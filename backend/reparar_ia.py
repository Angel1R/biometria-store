import os
from pymongo import MongoClient
from sentence_transformers import SentenceTransformer

# Conectamos a tu base de datos
MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise RuntimeError("MONGO_URI no está configurada en el entorno")
client = MongoClient(MONGO_URI)
collection = client["ecommerce_db"]["products"]

# Cargamos el MISMO cerebro que usa tu servidor
print("🧠 Cargando el cerebro de la IA...")
model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')

print("⚙️ Recalibrando los 100 productos de la base de datos. Esto tomará unos segundos...")

# Buscamos todos los productos y los arreglamos uno por uno
productos = collection.find({})
contador = 0

for producto in productos:
    # Creamos un texto estructurado y limpio
    categoria = producto.get('category', '').replace('-', ' ')
    texto_limpio = f"Categoría: {categoria}. Producto: {producto.get('title', '')}. Descripción: {producto.get('description', '')}"
    
    # Creamos el nuevo vector matemático
    nuevo_vector = model.encode(texto_limpio).tolist()
    
    # Actualizamos el producto en MongoDB
    collection.update_one({"_id": producto["_id"]}, {"$set": {"vector_embedding": nuevo_vector}})
    contador += 1

print(f"✅ ¡ÉXITO! {contador} productos fueron curados y recalibrados.")
print("Ya puedes cerrar esto e ir a probar tu aplicación móvil.")