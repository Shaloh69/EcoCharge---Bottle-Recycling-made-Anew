"""
EcoCharge AI Inference Service
Deployed on RunPod as a FastAPI container.
"""
import io
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, UploadFile, HTTPException, Security
from fastapi.security.api_key import APIKeyHeader
from PIL import Image

from .inference import load_models, run
from .schemas import DetectionResponse

API_KEY_NAME = "Authorization"
_api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)
_API_KEY = os.environ.get("AI_API_KEY", "dev-ai-secret")


def _check_api_key(api_key: str = Security(_api_key_header)):
    if not api_key or api_key.removeprefix("Bearer ").strip() != _API_KEY:
        raise HTTPException(status_code=401, detail="unauthorized")
    return api_key


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_models()
    yield


app = FastAPI(title="EcoCharge AI", version="1.0.0", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "ok", "model": "yolo26"}


@app.post("/api/detect", response_model=DetectionResponse)
async def detect(
    image: UploadFile = File(...),
    _key: str = Security(_check_api_key),
):
    """Accept an image upload and return bottle detection + classification results."""
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="file must be an image")

    contents = await image.read()
    try:
        pil_image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="could not read image")

    result = run(pil_image)
    return DetectionResponse(**result)
