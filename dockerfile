FROM python:3.12-slim-bookworm

WORKDIR /app

# Install git (required for GitPython)
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Configure git user for commits
RUN git config --system user.name "Altinity Agent" && \
    git config --system user.email "agent@altinity.local"

# Configure git environment
ENV GIT_CURL_VERBOSE=0
ENV GIT_TRACE=0

COPY requirements.txt ./

RUN pip install --no-cache-dir -r requirements.txt

COPY agents/ ./agents/
COPY frontend_api/ ./frontend_api/
COPY shared/ ./shared/

EXPOSE 8071

ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "frontend_api.main:app", "--host", "0.0.0.0", "--port", "8071"]