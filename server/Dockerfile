FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ai_engine.py .

EXPOSE 8000

CMD ["uvicorn", "ai_engine:app", "--host", "0.0.0.0", "--port", "8000"]
