# Tests

This directory contains the test suite for the Altinity Agents service.

## Running Tests

### Install dev dependencies

```bash
pip install -r requirements-dev.txt
```

### Run all tests

```bash
python -m pytest
```

### Run specific test file

```bash
python -m pytest tests/frontend_api/test_main.py
```

### Run tests with coverage report

```bash
python -m pytest --cov --cov-report=term-missing --cov-report=html
```

This will:

- Run all tests and measure code coverage
- `--cov-report=term-missing` - Show which specific lines are not covered in the terminal
- `--cov-report=html` - Save a detailed HTML report to `htmlcov/index.html`
