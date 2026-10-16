# Tests

This directory contains the test suite for the Studio Assistant service.

## Run the tests

### Install the development dependencies

```bash
uv sync
source .venv/bin/activate
```

### Run all tests

```bash
python -m pytest
```

### Run one test file

```bash
python -m pytest tests/api/test_main.py
```

### Run the tests with a coverage report

```bash
python -m pytest --cov --cov-report=term-missing --cov-report=html
```

The HTML report is in `htmlcov/index.html`.
