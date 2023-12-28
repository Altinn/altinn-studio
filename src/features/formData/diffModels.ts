import deepEqual from 'fast-deep-equal';

import type { IFormData } from 'src/features/formData/index';

export function diffModels(current: IFormData, prev: IFormData) {
  const changes: { [key: string]: string | null } = {};
  for (const key of Object.keys(current)) {
    if (current[key] !== prev[key] && !deepEqual(current[key], prev[key])) {
      changes[key] = String(prev[key]);
      if (prev[key] === undefined) {
        changes[key] = null;
      }
    }
  }
  for (const key of Object.keys(prev)) {
    if (!(key in current)) {
      changes[key] = String(prev[key]);
    }
  }

  return changes;
}
