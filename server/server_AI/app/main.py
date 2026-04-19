"""
EcoCharge AI Inference Service
Deployed on RunPod as a FastAPI container.
"""
import io
import logging
import os
import time
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, File, Request, UploadFile, HTTPException, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security.api_key import APIKeyHeader
from PIL import Image

from .inference import load_models, run
from .schemas import DetectionResponse

# ── Logging setup ──────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("ecocharge.ai")

# ── API key auth ───────────────────────────────────────────────────────────────
_API_KEY = os.environ.get("AI_API_KEY", "dev-ai-secret")

logger.info(f"AI_API_KEY loaded: {'(set)' if _API_KEY != 'dev-ai-secret' else '(using default dev-ai-secret — set AI_API_KEY env var!)'}")

# Accept key from X-Api-Key header (Cloudflare strips Authorization on content bodies)
_api_key_header = APIKeyHeader(name="X-Api-Key", auto_error=False)
# Fallback: also check Authorization header for health-ai empty-body checks
_auth_header = APIKeyHeader(name="Authorization", auto_error=False)


def _check_api_key(
    x_api_key: str = Security(_api_key_header),
    authorization: str = Security(_auth_header),
):
    # Prefer X-Api-Key; fall back to Authorization Bearer
    provided = None
    if x_api_key:
        provided = x_api_key.strip()
        logger.debug(f"AUTH via X-Api-Key: prefix={provided[:8]}...")
    elif authorization:
        provided = authorization.removeprefix("Bearer ").strip()
        logger.debug(f"AUTH via Authorization header: prefix={provided[:8]}...")

    if not provided:
        logger.warning("AUTH FAILED — no API key provided (X-Api-Key or Authorization)")
        raise HTTPException(status_code=401, detail="unauthorized — no API key")

    if provided != _API_KEY:
        logger.warning(
            f"AUTH FAILED — key mismatch | provided_prefix={provided[:8]}... "
            f"expected_prefix={_API_KEY[:8]}..."
        )
        raise HTTPException(status_code=401, detail="unauthorized — invalid API key")

    return provided


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Loading YOLO + classifier models...")
    load_models()
    logger.info("Models loaded — AI server ready")
    yield
    logger.info("AI server shutting down")


app = FastAPI(title="EcoCharge AI", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request logging middleware ─────────────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    client = request.client.host if request.client else "?"
    logger.info(f"→ {request.method} {request.url.path} | client={client}")

    response = await call_next(request)

    ms = int((time.perf_counter() - start) * 1000)
    level = logging.WARNING if response.status_code >= 400 else logging.INFO
    logger.log(
        level,
        f"← {request.method} {request.url.path} | status={response.status_code} | {ms}ms",
    )
    return response


# ── Exception handler ──────────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled error on {request.method} {request.url.path}: {exc}")
    return JSONResponse(status_code=500, content={"detail": "internal server error"})


@app.get("/health")
def health():
    logger.info("Health check OK")
    return {"status": "ok", "model": "yolo26"}


@app.post("/api/detect", response_model=DetectionResponse)
async def detect(
    image: UploadFile = File(...),
    _key: str = Security(_check_api_key),
):
    """Accept an image upload and return bottle detection + classification results."""
    logger.info(f"DETECT request | filename={image.filename} content_type={image.content_type}")

    if not image.content_type or not image.content_type.startswith("image/"):
        logger.warning(f"DETECT rejected — invalid content_type={image.content_type}")
        raise HTTPException(status_code=400, detail="file must be an image")

    contents = await image.read()
    logger.info(f"DETECT image size={len(contents)} bytes")

    try:
        pil_image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as e:
        logger.error(f"DETECT failed — could not open image: {e}")
        raise HTTPException(status_code=400, detail="could not read image")

    try:
        result = run(pil_image)
    except Exception as e:
        logger.exception(f"DETECT failed — inference error: {e}")
        raise HTTPException(status_code=500, detail=f"inference error: {e}")

    logger.info(
        f"DETECT result | detected={result.get('detected')} "
        f"confidence={result.get('confidence') or 0:.2f} "
        f"brand={result.get('brand')} volume={result.get('volume_ml')}mL "
        f"condition={result.get('condition')}"
    )
    return DetectionResponse(**result)
