"""Agent quality benchmark: run the agent against Langfuse datasets and
record scored, comparable dataset runs. See README.md in this package."""

from pathlib import Path

try:  # load benchmarks/.env (and a project .env) for every entry point
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).parent / ".env")
    load_dotenv()
except ImportError:
    pass
