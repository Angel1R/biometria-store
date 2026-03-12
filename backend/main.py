from fastapi import FastAPI
from pymongo import MongoClient
from sentence_transformers import SentenceTransformer
from pydantic import BaseModel
from datetime import datetime
import numpy as np 
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="API biometriaStore")

# --- CONFIGURACIÓN CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # En producción cambia el "*" por tu dominio real
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CONFIGURACIÓN BASE DE DATOS ---
MONGO_URI = "mongodb+srv://antonio:1@cluster0.avklr.mongodb.net/?appName=Cluster0"
client = MongoClient(MONGO_URI)
db = client["ecommerce_db"]
collection = db["products"]
interactions_collection = db["user_interactions"]

# --- CARGA DEL MODELO DE IA ---
model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')

# --- MODELO DE DATOS PARA RECIBIR DESDE IONIC ---
class Interaction(BaseModel):
    user_id: str
    product_id: int
    interaction_type: str # Opciones: 'view', 'cart', 'purchase'

@app.get("/")
def home():
    return {"mensaje": "API de biometriaStore funcionando correctamente 🚀"}

# --- RUTA 1: GUARDAR INTERACCIONES ---
@app.post("/interact/")
def register_interaction(interaction: Interaction):
    weight = 1
    if interaction.interaction_type == 'cart':
        weight = 3
    elif interaction.interaction_type == 'purchase':
        weight = 5

    doc = {
        "user_id": interaction.user_id,
        "product_id": interaction.product_id,
        "interaction_type": interaction.interaction_type,
        "weight": weight,
        "timestamp": datetime.utcnow()
    }

    interactions_collection.insert_one(doc)
    doc["_id"] = str(doc["_id"])
    
    return {"mensaje": "Interacción guardada con éxito", "data": doc}

# --- RUTA 2: RECOMENDACIONES GENERALES (Por texto) ---
@app.get("/recommendations/")
def get_recommendations(query: str, limit: int = 5):
    query_vector = model.encode(query).tolist()

    pipeline = [
        {
            "$vectorSearch": {
                "index": "ecommerce", # <-- CAMBIADO DE 'default' A 'ecommerce'
                "path": "vector_embedding",
                "queryVector": query_vector,
                "numCandidates": 100,
                "limit": limit
            }
        },
        {
            "$project": {
                "_id": 0,
                "product_id": 1,
                "title": 1,
                "description": 1,
                "price": 1,
                "thumbnail": 1,
                "score": {"$meta": "vectorSearchScore"}
            }
        }
    ]

    resultados = list(collection.aggregate(pipeline))
    return {"query": query, "resultados": resultados}

# --- RUTA 3: RECOMENDACIONES PERSONALIZADAS POR USUARIO ---
@app.get("/recommendations/user/{user_id}")
def get_user_recommendations(user_id: str, limit: int = 5):
    interacciones = list(interactions_collection.find({"user_id": user_id}).limit(20))
    
    if not interacciones:
        return {"mensaje": f"El usuario {user_id} es nuevo. Aquí mostraríamos los productos más populares."}
        
    pesos_por_producto = {}
    for inter in interacciones:
        pid = inter["product_id"]
        if pid not in pesos_por_producto:
            pesos_por_producto[pid] = 0
        pesos_por_producto[pid] += inter["weight"]
        
    productos_interactuados = list(collection.find({"product_id": {"$in": list(pesos_por_producto.keys())}}))
    
    if not productos_interactuados:
        return {"mensaje": "No se encontraron los datos de los productos."}
        
    vectores = []
    pesos = []
    for prod in productos_interactuados:
        pid = prod["product_id"]
        vectores.append(prod["vector_embedding"])
        pesos.append(pesos_por_producto[pid])
        
    vectores_np = np.array(vectores)
    pesos_np = np.array(pesos)
    vector_usuario = np.average(vectores_np, axis=0, weights=pesos_np).tolist()
    
    pipeline = [
        {
            "$vectorSearch": {
                "index": "ecommerce", # <-- CAMBIADO DE 'default' A 'ecommerce'
                "path": "vector_embedding",
                "queryVector": vector_usuario,
                "numCandidates": 100,
                "limit": limit + len(pesos_por_producto) 
            }
        },
        # --- FILTRO COMENTADO TEMPORALMENTE PARA VER SI ESTO BLOQUEABA LOS RESULTADOS ---
         {
             "$match": {
                 "product_id": {"$nin": list(pesos_por_producto.keys())}
             }
         },
        {
            "$limit": limit
        },
        {
            "$project": {
                "_id": 0,
                "product_id": 1,
                "title": 1,
                "category": 1,
                "price": 1,
                "score": {"$meta": "vectorSearchScore"}
            }
        }
    ]
    
    resultados = list(collection.aggregate(pipeline))
    
    return {
        "usuario": user_id, 
        "productos_analizados": len(productos_interactuados),
        "recomendaciones": resultados
    }