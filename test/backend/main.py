import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base
from routes.end_to_end import router as e2e_router
from routes.modules import router as modules_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="DLP Training Platform API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(e2e_router)
app.include_router(modules_router)


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "2.0.0"}
