FROM python:3.12-slim-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

RUN git config --system user.name "Altinity Agent" && \
    git config --system user.email "agent@altinn.studio"

COPY requirements.txt ./

RUN pip install --no-cache-dir -r requirements.txt

COPY agents/ ./agents/
COPY frontend_api/ ./frontend_api/
COPY shared/ ./shared/

EXPOSE 8071

ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "frontend_api.main:app", "--host", "0.0.0.0", "--port", "8071"]