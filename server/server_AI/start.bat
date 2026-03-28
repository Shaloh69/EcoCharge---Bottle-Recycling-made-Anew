@echo off
cd /d %~dp0
set AI_API_KEY=change-this-to-a-strong-key
set YOLO_WEIGHTS=models/best.pt
set CLASSIFIER_WEIGHTS=models/best_classifier.pt
set CONF_THRESHOLD=0.40
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
