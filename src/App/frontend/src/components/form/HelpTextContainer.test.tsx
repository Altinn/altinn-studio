import React from 'react';

import { screen } from '@testing-library/react';

import { HelpTextContainer } from 'src/components/form/HelpTextContainer';
import { renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';
import type { IHelpTextContainerProps } from 'src/components/form/HelpTextContainer';

describe('HelpTextContainer', () => {
  const render = async (props?: Partial<IHelpTextContainerProps>) => {
    await renderWithoutInstanceAndLayout({
      renderer: () => (
        <HelpTextContainer
          id='test-id'
          helpText='Help text content'
          {...props}
        />
      ),
    });
  };

  it('receives correct accessible title', async () => {
    await render();
    expect(
      screen.getByRole('button', {
        name: /Hjelp/i,
      }),
    ).toBeInTheDocument();

    await render({ title: 'My labelname' });

    expect(
      screen.getByRole('button', {
        name: /Hjelpetekst for My labelname/i,
      }),
    ).toBeInTheDocument();
  });
});
