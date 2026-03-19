import hashlib
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
users_collection = db["users"] # <-- NUEVA COLECCIÓN PARA USUARIOS

# --- CARGA DEL MODELO DE IA ---
model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')

# --- MODELOS DE DATOS ---
class Interaction(BaseModel):
    user_id: str
    product_id: int
    interaction_type: str # Opciones: 'view', 'cart', 'purchase'

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
    # Verificar si el correo ya existe
    existing_user = users_collection.find_one({"email": user.email.lower()})
    if existing_user:
        raise HTTPException(status_code=400, detail="El correo ya está registrado.")
    
    nuevo_usuario = {
        "user_id": f"usr_{hashlib.md5(user.email.encode()).hexdigest()[:8]}", # ID único
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
    # Buscar al usuario
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
        weight = 4  # <- CLAVE

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
    ] #🥵
    
    resultados = list(collection.aggregate(pipeline))
    
    return {
        "usuario": user_id, 
        "productos_analizados": len(productos_interactuados),
        "recomendaciones": resultados
    }