import hashlib
import uvicorn
from fastapi import FastAPI, HTTPException, status
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
    allow_origins=["*"], 
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
users_collection = db["users"] 

# --- CARGA DEL MODELO DE IA ---
print("Cargando modelo de IA... espera un momento.")
model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
print("Modelo cargado exitosamente.")

# --- MODELOS DE DATOS ---
class Interaction(BaseModel):
    user_id: str
    product_id: int
    interaction_type: str 

class UserRegister(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

@app.get("/")
def home():
    return {"mensaje": "API de biometriaStore funcionando correctamente"}

# --- RUTA DE REGISTRO ---
@app.post("/auth/register")
def register_user(user: UserRegister):
    existing_user = users_collection.find_one({"email": user.email.lower()})
    if existing_user:
        raise HTTPException(status_code=400, detail="El correo ya está registrado.")
    
    nuevo_usuario = {
        "user_id": f"usr_{hashlib.md5(user.email.encode()).hexdigest()[:8]}", 
        "name": user.name,
        "email": user.email.lower(),
        "password": hash_password(user.password),
        "created_at": datetime.utcnow()
    }
    
    users_collection.insert_one(nuevo_usuario)
    return {
        "mensaje": "Usuario registrado exitosamente", 
        "user_id": nuevo_usuario["user_id"], 
        "name": nuevo_usuario["name"]
    }

# --- RUTA DE LOGIN ---
@app.post("/auth/login")
def login_user(user: UserLogin):
    db_user = users_collection.find_one({"email": user.email.lower()})
    
    if not db_user or db_user["password"] != hash_password(user.password):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos.")
        
    return {
        "mensaje": "Inicio de sesión exitoso", 
        "user_id": db_user["user_id"], 
        "name": db_user["name"],
        "email": db_user["email"]
    }

# --- RUTA 1: GUARDAR INTERACCIONES ---
@app.post("/interact/")
def register_interaction(interaction: Interaction):
    weight = 1
    if interaction.interaction_type == 'cart':
        weight = 3
    elif interaction.interaction_type == 'purchase':
        weight = 5
    elif interaction.interaction_type == 'like':
        weight = 4 

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

# --- RUTA 2: RECOMENDACIONES GENERALES ---
@app.get("/recommendations/")
def get_recommendations(query: str, limit: int = 5):
    query_vector = model.encode(query).tolist()
    pipeline = [
        {
            "$vectorSearch": {
                "index": "ecommerce",
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

# --- RUTA 3: PERSONALIZADAS ---
@app.get("/recommendations/user/{user_id}")
def get_user_recommendations(user_id: str, limit: int = 5):
    interacciones = list(interactions_collection.find({"user_id": user_id}).limit(20))
    if not interacciones:
        return {"mensaje": f"Usuario {user_id} nuevo."}
        
    pesos_por_producto = {}
    for inter in interacciones:
        pid = inter["product_id"]
        pesos_por_producto[pid] = pesos_por_producto.get(pid, 0) + inter["weight"]
        
    productos_interactuados = list(collection.find({"product_id": {"$in": list(pesos_por_producto.keys())}}))
    if not productos_interactuados:
        return {"mensaje": "No hay datos de productos."}
        
    vectores = [p["vector_embedding"] for p in productos_interactuados]
    pesos = [pesos_por_producto[p["product_id"]] for p in productos_interactuados]
    vector_usuario = np.average(vectores, axis=0, weights=pesos).tolist()
    
    pipeline = [
        {"$vectorSearch": {"index": "ecommerce", "path": "vector_embedding", "queryVector": vector_usuario, "numCandidates": 100, "limit": limit + len(pesos_por_producto)}},
        {"$match": {"product_id": {"$nin": list(pesos_por_producto.keys())}}},
        {"$limit": limit},
        {"$project": {"_id": 0, "product_id": 1, "title": 1, "category": 1, "price": 1, "score": {"$meta": "vectorSearchScore"}}}
    ]
    
    resultados = list(collection.aggregate(pipeline))
    return {"usuario": user_id, "recomendaciones": resultados}

# --- BLOQUE DE ARRANQUE (CORREGIDO) ---
if __name__ == "__main__":
    # Host 0.0.0.0 permite que el celular vea a la compu en la misma red WiFi
    uvicorn.run(app, host="0.0.0.0", port=5000)