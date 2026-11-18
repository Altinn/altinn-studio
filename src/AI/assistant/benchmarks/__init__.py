"""Agent quality benchmark: run the agent against Langfuse datasets and
record scored, comparable dataset runs. See README.md in this package."""

import os
from pathlib import Path

try:  # load benchmarks/.env (and a project .env) for every entry point
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).parent / ".env")
    load_dotenv()
except ImportError:
    pass

# The config loads the project .env on import, which would then win over benchmarks/.env.
from shared.config import get_config

# The SDK clients read the host from the environment and would otherwise reach cloud.langfuse.com.
os.environ["LANGFUSE_BASE_URL"] = get_config().LANGFUSE_HOST
