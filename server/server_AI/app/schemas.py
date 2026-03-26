from pydantic import BaseModel
from typing import Optional


class DetectionResponse(BaseModel):
    detected: bool
    confidence: Optional[float] = None
    bounding_box: Optional[list[int]] = None
    brand: Optional[str] = None
    brand_confidence: Optional[float] = None
    volume_ml: Optional[int] = None
    volume_confidence: Optional[float] = None
    condition: Optional[str] = None
    condition_confidence: Optional[float] = None
