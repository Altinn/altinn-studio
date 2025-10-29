# CookieStorage

Type-safe cookie storage with automatic JSON serialization.

## Usage

### Basic Operations

```typescript
import { CookieStorage } from '@studio/browser-storage';

// Set a cookie
CookieStorage.setItem('username', 'alice');

// Get a cookie
const username = CookieStorage.getItem<string>('username');

// Remove a cookie
CookieStorage.removeItem('username');

// Get all cookie keys
const keys = CookieStorage.getAllKeys();
```

### Type-Safe Objects

```typescript
interface UserPreferences {
  theme: 'light' | 'dark';
  language: string;
  notifications: boolean;
}

// Store with type safety
CookieStorage.setItem<UserPreferences>('prefs', {
  theme: 'dark',
  language: 'nb',
  notifications: true,
});

// Retrieve with type safety
const prefs = CookieStorage.getItem<UserPreferences>('prefs');
console.log(prefs?.theme); // 'dark'
```

### Cookie Options

```typescript
CookieStorage.setItem('session', sessionData, {
  expires: 7, // Expires in 7 days
  path: '/',
  domain: '.altinn.no',
  secure: true, // HTTPS only
  sameSite: 'Strict', // CSRF protection
});

// Or use a Date object
const expiryDate = new Date('2025-12-31');
CookieStorage.setItem('token', tokenValue, {
  expires: expiryDate,
});
```

### Available Options

| Option     | Type                          | Default      | Description                                        |
| ---------- | ----------------------------- | ------------ | -------------------------------------------------- |
| `expires`  | `Date \| number`              | Session      | Expiration date or number of days until expiration |
| `path`     | `string`                      | `'/'`        | URL path that must exist for the cookie to be sent |
| `domain`   | `string`                      | Current host | Domain where the cookie is valid                   |
| `secure`   | `boolean`                     | `false`      | If true, cookie only sent over HTTPS               |
| `sameSite` | `'Strict' \| 'Lax' \| 'None'` | `'Lax'`      | Controls cross-site request behavior               |

### Removing Cookies

When removing cookies with specific path or domain, you must match the original options:

```typescript
// Set with specific path
CookieStorage.setItem('key', 'value', { path: '/admin' });

// Remove with matching path
CookieStorage.removeItem('key', { path: '/admin' });
```

### Security Best Practices

For production use, always set appropriate security flags:

```typescript
// Session cookie with strict security
CookieStorage.setItem('session', sessionData, {
  expires: 1,
  secure: true,
  sameSite: 'Strict',
  path: '/',
});

// Authentication token
CookieStorage.setItem('auth_token', token, {
  expires: 7,
  secure: true,
  sameSite: 'Lax',
  path: '/',
});
```

### SameSite Options

- **`Strict`**: Cookie only sent in first-party context (best security, may affect user experience)
- **`Lax`**: Cookie sent with top-level navigation (recommended for most use cases)
- **`None`**: Cookie sent in all contexts (requires `secure: true`, needed for cross-site requests)

## API

### `setItem<T>(key: string, value: T, options?: CookieOptions): void`

Sets a cookie with automatic JSON serialization. Rejects `undefined` and `null` values with a console warning.

### `getItem<T>(key: string): T | null`

Gets a cookie value with automatic JSON deserialization. Returns `null` if the cookie doesn't exist or if parsing fails.

### `removeItem(key: string, options?: Pick<CookieOptions, 'path' | 'domain'>): void`

Removes a cookie. Path and domain options should match the original cookie.

### `getAllKeys(): string[]`

Returns an array of all cookie names (keys).
