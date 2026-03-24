# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Overview

A CLI tool (`studioctl`) to improve developer experience for developing and interacting with Altinn Studio apps locally. Replaces manual clone/setup workflow with a single unified interface.

### Development

See @Makefile

```sh
# 1. Make your changes

make build     # 2. Build
make lint-fix  # 3. Lint autofix
make fmt       # 4. Formatting
make lint      # 5. Lint
make test      # 6. Unit tests
```

### Principles

- Handle errors
- Avoid nolint, the bar should be high
- Respect fieldalignment lints (`make lint-fix` auto-corrects struct field ordering)
