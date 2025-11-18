# Python image with uv pre-installed
FROM ghcr.io/astral-sh/uv:0.9.7-python3.12-bookworm-slim

WORKDIR /app

COPY pyproject.toml ./
COPY uv.lock ./

RUN uv pip install --system .

COPY codegen/ ./codegen/
COPY server/ ./server/
COPY scripts/ ./scripts/

EXPOSE 8069

ENV PYTHONUNBUFFERED=1

CMD ["python", "-m", "server.main"]