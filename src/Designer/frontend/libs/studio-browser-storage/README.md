# @studio/browser-storage

Streamlined, type-safe wrappers for browser storage APIs. This library provides a consistent interface for working with different browser storage mechanisms including localStorage, sessionStorage, and cookies.

## Purpose

Browser storage APIs have inconsistent interfaces and quirks. This library:

- Provides a unified, type-safe API across different storage mechanisms
- Handles JSON serialization/deserialization automatically
- Simplifies common storage operations

## Installation

This is a workspace package. Add it to your package.json dependencies:

```json
{
  "dependencies": {
    "@studio/browser-storage": "workspace:^"
  }
}
```

## Available Storage

### CookieStorage

Type-safe cookie operations with security options.

```typescript
import { CookieStorage } from '@studio/browser-storage';

CookieStorage.setItem('key', value, { expires: 7, secure: true });
const value = CookieStorage.getItem<Type>('key');
```

[See CookieStorage documentation](./src/CookieStorage/README.md)

```bash
yarn workspace @studio/browser-storage test
```
