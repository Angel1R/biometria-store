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

# Use a lightweight and fast model to generate vectors (384 dimensions)
MODEL_NAME = 'paraphrase-multilingual-MiniLM-L12-v2' 

def run_ingestion():
    print("Starting data ingestion...")

    # 1. Connect to MongoDB
    try:
        client = pymongo.MongoClient(MONGO_URI)
        db = client[DB_NAME]
        collection = db[COLLECTION_NAME]
        # Clean the collection to avoid duplicates in tests
        collection.delete_many({}) 
        print("Connected to MongoDB (Collection cleaned).")
    except Exception as e:
        print(f"Connection error: {e}")
        return

    # 2. Load AI model (may take a while the first time it's downloaded)
    print("Loading Artificial Intelligence model...")
    model = SentenceTransformer(MODEL_NAME)

    # 3. Get products from API
    print("Downloading products from DummyJSON...")
    response = requests.get('https://dummyjson.com/products?limit=100')
    products = response.json().get('products', [])

    documents_to_insert = []

    print(f"Processing {len(products)} products and generating vectors...")
    
    for product in products:
        # Use .get() to avoid errors if the product doesn't have a brand
        marca = product.get('brand', '')
        
        # Join the texts
        text_to_embed = f"{product.get('title', '')} {product.get('category', '')} {marca} {product.get('description', '')}"
        
        # Generate the vector (embedding)
        vector = model.encode(text_to_embed).tolist()

        # Prepare the document for Mongo
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

    # 4. Insert into MongoDB
    if documents_to_insert:
        collection.insert_many(documents_to_insert)
        print(f"Success! {len(documents_to_insert)} products with their vectors were inserted into Atlas.")
    else:
        print("No products found.")

if __name__ == "__main__":
    run_ingestion()
