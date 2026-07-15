import requests
import pymongo
import os
from sentence_transformers import SentenceTransformer

# --- CONFIGURACIÓN ---
MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise RuntimeError("MONGO_URI no está configurada en el entorno")
DB_NAME = "ecommerce_db"
COLLECTION_NAME = "products"

# Usamos un modelo ligero y rápido para generar los vectores (384 dimensiones)x
MODEL_NAME = 'paraphrase-multilingual-MiniLM-L12-v2' 

def run_ingestion():
    print("🚀 Iniciando ingesta de datos...")

    # 1. Conexión a MongoDB
    try:
        client = pymongo.MongoClient(MONGO_URI)
        db = client[DB_NAME]
        collection = db[COLLECTION_NAME]
        # Limpiamos la colección para evitar duplicados en pruebas
        collection.delete_many({}) 
        print("✅ Conectado a MongoDB (Colección limpiada).")
    except Exception as e:
        print(f"❌ Error de conexión: {e}")
        return

    # 2. Cargar modelo de IA (puede tardar un poco la primera vez que se descarga)
    print("🧠 Cargando modelo de Inteligencia Artificial...")
    model = SentenceTransformer(MODEL_NAME)

    # 3. Obtener productos de la API
    print("📥 Descargando productos de DummyJSON...")
    response = requests.get('https://dummyjson.com/products?limit=100')
    products = response.json().get('products', [])

    documents_to_insert = []

    print(f"🔄 Procesando {len(products)} productos y generando vectores...")
    
    for product in products:
        # Usamos .get() para evitar errores si el producto no tiene marca
        marca = product.get('brand', '')
        
        # Juntamos los textos
        text_to_embed = f"{product.get('title', '')} {product.get('category', '')} {marca} {product.get('description', '')}"
        
        # Generamos el vector (embedding)
        vector = model.encode(text_to_embed).tolist()

        # Preparamos el documento para Mongo
        doc = {
            "product_id": product.get('id'),
            "title": product.get('title'),
            "description": product.get('description'),
            "price": product.get('price'),
            "category": product.get('category'),
            "thumbnail": product.get('thumbnail'), 
            "images": product.get('images', []),       
            "rating": product.get('rating'),
            "vector_embedding": vector 
        }
        documents_to_insert.append(doc)

    # 4. Insertar en MongoDB
    if documents_to_insert:
        collection.insert_many(documents_to_insert)
        print(f"🎉 ¡Éxito! Se insertaron {len(documents_to_insert)} productos con sus vectores en Atlas.")
    else:
        print("⚠️ No se encontraron productos.")

if __name__ == "__main__":
    run_ingestion()