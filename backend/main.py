import base64
import hashlib
import io
import os
import uvicorn
import numpy as np
import cv2
from insightface.app import FaceAnalysis
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from sentence_transformers import SentenceTransformer
from pydantic import BaseModel
from datetime import datetime
from PIL import Image

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
MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise RuntimeError("MONGO_URI no está configurada en el entorno")
client = MongoClient(MONGO_URI)
db = client["ecommerce_db"]
collection = db["products"]
interactions_collection = db["user_interactions"]
users_collection = db["users"]
face_collection = db["face_embeddings"]

# --- CARGA DEL MODELO DE RECOMENDACIONES ---
print("Cargando modelo de recomendaciones...")
model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
print("Modelo de recomendaciones cargado.")

# --- CONFIGURACIÓN INSIGHTFACE ---
print("Cargando modelo de reconocimiento facial (InsightFace)...")
face_app = FaceAnalysis(
    name="buffalo_sc",
    providers=["CPUExecutionProvider"]
)
face_app.prepare(ctx_id=0, det_size=(640, 640))
print("Modelo facial cargado.")

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

class FaceRegister(BaseModel):
    user_id: str
    image_base64: str

class FaceLogin(BaseModel):
    image_base64: str


# --- UTILIDADES ---
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def decode_image_to_bgr(image_base64: str) -> np.ndarray:
    if "," in image_base64:
        image_base64 = image_base64.split(",")[1]
    image_bytes = base64.b64decode(image_base64)
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

def extract_face_embedding(image_bgr: np.ndarray) -> list | None:
    faces = face_app.get(image_bgr)
    if not faces:
        return None
    face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
    return face.embedding.tolist()

def cosine_similarity(a: list, b: list) -> float:
    va = np.array(a)
    vb = np.array(b)
    norm_a = np.linalg.norm(va)
    norm_b = np.linalg.norm(vb)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(va, vb) / (norm_a * norm_b))


# --- RUTAS ORIGINALES ---
@app.get("/")
def home():
    return {"mensaje": "API de biometriaStore funcionando correctamente"}

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

# Route to get user likes from database
@app.get("/interact/{user_id}/likes")
def get_user_likes(user_id: str):
    likes = list(interactions_collection.find({"user_id": user_id, "interaction_type": "like"}, {"product_id": 1, "_id": 0}))
    liked_ids = [item["product_id"] for item in likes]
    return {"liked_products": liked_ids}

@app.get("/recommendations/")
def get_recommendations(query: str, limit: int = 5):
    query_vector = model.encode(query).tolist()
    pipeline = [
        {"$vectorSearch": {"index": "ecommerce", "path": "vector_embedding", "queryVector": query_vector, "numCandidates": 100, "limit": limit}},
        {"$project": {"_id": 0, "product_id": 1, "title": 1, "description": 1, "price": 1, "thumbnail": 1, "score": {"$meta": "vectorSearchScore"}}}
    ]
    return {"query": query, "resultados": list(collection.aggregate(pipeline))}

@app.get("/recommendations/user/{user_id}")
def get_user_recommendations(user_id: str, limit: int = 5):
    # Sort by timestamp descending to read recent interactions first
    interacciones = list(interactions_collection.find({"user_id": user_id}).sort("timestamp", -1).limit(10))
    
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
        {"$project": {"_id": 0, "product_id": 1, "title": 1, "category": 1, "description": 1, "price": 1, "thumbnail": 1, "score": {"$meta": "vectorSearchScore"}}}
    ]
    return {"usuario": user_id, "recomendaciones": list(collection.aggregate(pipeline))}


# --- FACIAL RECOGNITION ROUTES ---
@app.post("/auth/face/register")
def register_face(data: FaceRegister):
    db_user = users_collection.find_one({"user_id": data.user_id})
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    try:
        image_bgr = decode_image_to_bgr(data.image_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="No se pudo decodificar la imagen.")

    embedding = extract_face_embedding(image_bgr)
    if embedding is None:
        raise HTTPException(
            status_code=400,
            detail="No se detectó ningún rostro. Asegúrate de que tu cara esté bien iluminada y centrada."
        )

    face_collection.update_one(
        {"user_id": data.user_id},
        {
            "$set": {
                "user_id": data.user_id,
                "email": db_user["email"],
                "embedding": embedding,  
                "updated_at": datetime.utcnow()
            }
        },
        upsert=True
    )
    return {"mensaje": "Rostro registrado correctamente.", "user_id": data.user_id}


@app.post("/auth/face/login")
def login_face(data: FaceLogin):
    THRESHOLD = 0.4

    try:
        image_bgr = decode_image_to_bgr(data.image_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="No se pudo decodificar la imagen.")

    embedding_entrada = extract_face_embedding(image_bgr)
    if embedding_entrada is None:
        raise HTTPException(
            status_code=400,
            detail="No se detectó ningún rostro. Asegúrate de que tu cara esté bien iluminada y centrada."
        )

    todos_los_rostros = list(face_collection.find({}))
    if not todos_los_rostros:
        raise HTTPException(status_code=404, detail="No hay rostros registrados en el sistema.")

    mejor_similitud = -1.0
    mejor_usuario = None

    for registro in todos_los_rostros:
        similitud = cosine_similarity(embedding_entrada, registro["embedding"])
        if similitud > mejor_similitud:
            mejor_similitud = similitud
            mejor_usuario = registro

    if mejor_similitud < THRESHOLD or mejor_usuario is None:
        raise HTTPException(
            status_code=401,
            detail=f"Acceso denegado. Rostro no reconocido (similitud: {mejor_similitud:.2f})"
        )

    db_user = users_collection.find_one({"user_id": mejor_usuario["user_id"]})
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    return {
        "mensaje": "Inicio de sesión facial exitoso",
        "user_id": db_user["user_id"],
        "name": db_user["name"],
        "email": db_user["email"],
        "similitud": round(mejor_similitud, 4)
    }


@app.delete("/auth/face/{user_id}")
def delete_face(user_id: str):
    result = face_collection.delete_one({"user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="No hay rostro registrado para este usuario.")
    return {"mensaje": "Rostro eliminado correctamente.", "user_id": user_id}


@app.get("/auth/face/status/{user_id}")
def face_status(user_id: str):
    registro = face_collection.find_one({"user_id": user_id})
    return {
        "user_id": user_id,
        "has_face": registro is not None,
        "updated_at": registro["updated_at"].isoformat() if registro else None
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)
