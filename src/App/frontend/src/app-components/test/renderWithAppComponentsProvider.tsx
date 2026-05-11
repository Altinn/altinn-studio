import React, { ReactElement } from 'react';

import { render, RenderOptions } from '@testing-library/react';

import { AppComponentsProvider, TranslationKeyMap } from 'src/app-components/AppComponentsProvider';

export function renderWithAppComponentsProvider(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, {
    wrapper: ({ children }) => (
      <AppComponentsProvider
        translate={(key) => key}
        TranslateComponent={({ tKey }) => tKey}
        translationKeyMap={
          {
            'button.loading': 'button.loading',
            'pagination.page_number': 'pagination.page_number',
            'input.remaining_characters': 'input.remaining_characters',
            'input.exceeded_max_limit': 'input.exceeded_max_limit',
          } as unknown as TranslationKeyMap
        }
      >
        {children}
      </AppComponentsProvider>
    ),
    ...options,
  });
}
