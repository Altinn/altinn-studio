# AGENTS.md

This file provides guidance to AI agents when working with code in this directory.

## Overview

Deployer is a self-contained local tool — a Node.js HTTP server plus a plain JS/HTML/CSS frontend. There is no build step and no npm scripts beyond `npm install`. The only runtime dependency is the `gh` CLI (GitHub CLI), which must be authenticated.

Before making changes:
- Read README.md
- Understand the architecture and current patterns

## Commands

- `make` — syntax-checks all JS files (`node --check`). Safe for agents to run.
- `make run` — starts the server. For developer use only; do not run in agent sessions.

