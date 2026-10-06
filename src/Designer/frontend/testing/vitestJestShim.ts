import { vi } from 'vitest';

// Shared test helpers that have not been migrated yet call the global `jest` object (jest.fn, jest.spyOn, ...).
// DOM Testing Library also detects fake timers through this global name, so waitFor advances vi.useFakeTimers().
// Remove the helpers' dependency on this shim together with Jest when the migration is complete.
Object.assign(globalThis, { jest: vi });
