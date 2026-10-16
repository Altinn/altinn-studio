import { describe, expect, it, vi } from 'vitest';

import { validateLayoutProperties } from 'src/utils/layout/validation/LayoutPropertiesValidation';
import type { ValidateFunc } from 'src/core/queries/layoutSchema/index';
import type { FormBootstrapContextValue } from 'src/features/formBootstrap/types';

describe('validateLayoutProperties', () => {
  it('only validates externally configurable components against the serialized layout schema', () => {
    const schemaValidator = vi.fn<ValidateFunc>();
    const bootstrap = {
      dataModels: {},
      layoutLookups: {
        allComponents: {
          likert: { id: 'likert', type: 'Likert' },
          likertItem: { id: 'likert-item', type: 'LikertItem' },
        },
      },
    } as unknown as FormBootstrapContextValue;

    validateLayoutProperties({ bootstrap, schemaValidator });

    expect(schemaValidator).toHaveBeenCalledOnce();
    expect(schemaValidator).toHaveBeenCalledWith(
      '#/definitions/AnyComponent',
      expect.objectContaining({ type: 'Likert' }),
    );
  });
});
