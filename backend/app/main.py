from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database.connection import Base, engine
from app.models.dataset import Dataset
from app.routes.dataset_routes import router as dataset_router

app = FastAPI(
    title="DataLens",
    description="Data Cleaning & Visualization Platform",
    version="1.0.0"
)
Base.metadata.create_all(bind=engine)
app.include_router(dataset_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {
        "message": "Welcome to DataLens",
        "status": "Backend is running"
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy"
    }