# Tests

This directory contains the test suite for the Studio Assistant service.

## Run the tests

### Install the development dependencies

```bash
pip install -r requirements.txt -r requirements-dev.txt
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

This command does these steps:

- It runs all tests and measures the code coverage.
- `--cov-report=term-missing` shows the lines that the tests do not cover, in the terminal.
- `--cov-report=html` writes a detailed HTML report to `htmlcov/index.html`.
