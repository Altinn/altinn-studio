import type { PageValidation } from '@app/layout-contract/generated/common.generated';

import { resolveNavigationValidation } from 'src/features/navigation/resolveNavigationValidation';

const required: PageValidation = { page: 'current', show: ['Required'] };
const schema: PageValidation = { page: 'current', show: ['Schema'] };
const disabled: PageValidation = { page: 'current', show: [] };

describe('resolveNavigationValidation', () => {
  it('leaves navigation unrestricted without configuration', () => {
    expect(resolveNavigationValidation([undefined, {}, undefined], 'return')).toBeUndefined();
  });

  it('uses a component return override instead of its Next validation', () => {
    expect(
      resolveNavigationValidation([{ validateOnBackToSummary: disabled, validationOnNavigation: required }], 'return'),
    ).toEqual(disabled);
  });

  it('uses component Next validation before a page or task return default', () => {
    expect(
      resolveNavigationValidation(
        [{ validationOnNavigation: required }, { validateOnBackToSummary: disabled }],
        'return',
      ),
    ).toEqual(required);
  });

  it('uses a page return override when the component has no configuration', () => {
    expect(
      resolveNavigationValidation(
        [{}, { validateOnBackToSummary: schema, validationOnNavigation: required }],
        'return',
      ),
    ).toEqual(schema);
  });

  it('uses page Next validation before a task return default', () => {
    expect(
      resolveNavigationValidation(
        [{}, { validationOnNavigation: required }, { validateOnBackToSummary: disabled }],
        'return',
      ),
    ).toEqual(required);
  });

  it('uses task Next validation before an app return default', () => {
    expect(
      resolveNavigationValidation(
        [{}, {}, { validationOnNavigation: required }, { validateOnBackToSummary: disabled }],
        'return',
      ),
    ).toEqual(required);
  });

  it('falls back to app return validation when narrower scopes are unset', () => {
    expect(resolveNavigationValidation([{}, undefined, {}, { validateOnBackToSummary: required }], 'return')).toEqual(
      required,
    );
  });

  it('ignores return overrides for ordinary Next navigation', () => {
    expect(
      resolveNavigationValidation(
        [{ validateOnBackToSummary: disabled }, { validationOnNavigation: required }],
        'next',
      ),
    ).toEqual(required);
  });
});
