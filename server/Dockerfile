FROM python:3.10

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ai_engine.py model.joblib metadata.joblib ./

EXPOSE 8000

CMD ["uvicorn", "ai_engine:app", "--host", "0.0.0.0", "--port", "8000"]
