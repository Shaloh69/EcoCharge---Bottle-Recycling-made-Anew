"""
HTTP-contract tests for the EcoCharge AI inference service.

Runs against the real FastAPI app with the real models loaded (this repo's
actual detector/classifier weights under models/) — no mocking of
inference itself, since the point is to catch real breakage in the
request/response contract, not just exercise isolated Python functions.
A blank synthetic image is used for the "valid image" cases; it is not
expected to trigger a bottle detection, so those tests assert the
response is well-formed rather than asserting detected=True.
"""
import io
import os

import pytest
from dotenv import load_dotenv
from fastapi.testclient import TestClient
from PIL import Image

load_dotenv()
API_KEY = os.environ.get("AI_API_KEY", "dev-ai-secret")

from app.main import app  # noqa: E402  (must follow load_dotenv/env setup)


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def _blank_jpeg() -> bytes:
    img = Image.new("RGB", (320, 240), color=(120, 160, 120))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_health_ok(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"


def test_detect_rejects_missing_api_key(client):
    r = client.post(
        "/api/detect",
        files={"image": ("bottle.jpg", _blank_jpeg(), "image/jpeg")},
    )
    assert r.status_code == 401


def test_detect_rejects_wrong_api_key(client):
    r = client.post(
        "/api/detect",
        files={"image": ("bottle.jpg", _blank_jpeg(), "image/jpeg")},
        headers={"X-Api-Key": "definitely-not-the-real-key"},
    )
    assert r.status_code == 401


def test_detect_accepts_key_via_authorization_bearer_fallback(client):
    # main.py's _check_api_key explicitly falls back to Authorization when
    # X-Api-Key is absent — kiosk_web's /api/health-ai check relies on this.
    r = client.post(
        "/api/detect",
        files={"image": ("bottle.jpg", _blank_jpeg(), "image/jpeg")},
        headers={"Authorization": f"Bearer {API_KEY}"},
    )
    assert r.status_code == 200


def test_detect_rejects_non_image_content_type(client):
    r = client.post(
        "/api/detect",
        files={"image": ("notes.txt", b"hello world", "text/plain")},
        headers={"X-Api-Key": API_KEY},
    )
    assert r.status_code == 400


def test_detect_rejects_corrupt_image_bytes(client):
    r = client.post(
        "/api/detect",
        files={"image": ("bottle.jpg", b"\xff\xd8not-a-real-jpeg", "image/jpeg")},
        headers={"X-Api-Key": API_KEY},
    )
    assert r.status_code == 400


def test_detect_returns_well_formed_response_for_a_valid_image(client):
    r = client.post(
        "/api/detect",
        files={"image": ("bottle.jpg", _blank_jpeg(), "image/jpeg")},
        headers={"X-Api-Key": API_KEY},
    )
    assert r.status_code == 200
    body = r.json()
    assert "detected" in body
    assert isinstance(body["detected"], bool)
    # A blank frame legitimately shouldn't detect a bottle — this pins the
    # negative case, not a claim about detection quality on real photos
    # (see runs/detect/ecocharge_bottle_det for the real mAP/precision numbers).
    assert body["detected"] is False
