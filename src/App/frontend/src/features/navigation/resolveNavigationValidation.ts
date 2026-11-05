import type { PageValidation } from '@app/layout-contract/generated/common.generated';

type NavigationValidationSettings = {
  validationOnNavigation?: PageValidation;
  validateOnBackToSummary?: PageValidation;
};

/** Settings are ordered from the most specific scope to the app default. */
export function resolveNavigationValidation(
  settings: readonly (NavigationValidationSettings | undefined)[],
  action: 'next' | 'return',
): PageValidation | undefined {
  for (const scope of settings) {
    const validation =
      (action === 'return' ? scope?.validateOnBackToSummary : undefined) ?? scope?.validationOnNavigation;
    if (validation) {
      return validation;
    }
  }
  return undefined;
}
