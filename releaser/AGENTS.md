# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Overview

A standalone release tooling CLI for automating releases of components in the Altinn Studio monorepo. Handles changelog management, version tagging, cross-platform builds, and GitHub release creation.

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

