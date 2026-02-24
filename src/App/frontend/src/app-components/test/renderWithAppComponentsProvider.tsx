import React, { ReactElement } from 'react';

import { render, RenderOptions } from '@testing-library/react';

import { AppComponentsProvider } from 'src/app-components/AppComponentsProvider';

export function renderWithAppComponentsProvider(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, {
    wrapper: ({ children }) => <AppComponentsProvider t={(key: string) => key}>{children}</AppComponentsProvider>,
    ...options,
  });
}
