# EcoCharge AI Inference Service — RunPod container
FROM pytorch/pytorch:2.3.0-cuda12.1-cudnn8-runtime

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/

# Model weights are mounted at /app/models/ via RunPod volume
# or copied in at build time if needed
RUN mkdir -p /app/models

ENV AI_API_KEY=change-me
ENV YOLO_WEIGHTS=/app/models/best.pt
ENV CLASSIFIER_WEIGHTS=/app/models/best_classifier.pt
ENV CONF_THRESHOLD=0.40

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
