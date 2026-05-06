import type { NavigateOptions } from 'react-router';

import type { NavigationState } from 'src/features/navigation/NavigationState';

export const preventFocusAndScrollResetOptions: NavigateOptions = {
  preventScrollReset: true,
  state: { preventFocusReset: true } satisfies NavigationState,
};

export const replaceAndPreventResetOptions: NavigateOptions = {
  replace: true,
  ...preventFocusAndScrollResetOptions,
};
