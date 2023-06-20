import React from 'react';

import { screen } from '@testing-library/react';

import { HelpTextContainer } from 'src/components/form/HelpTextContainer';
import { renderWithProviders } from 'src/testUtils';
import type { IHelpTextContainerProps } from 'src/components/form/HelpTextContainer';

describe('HelpTextContainer', () => {
  const render = (props?: Partial<IHelpTextContainerProps>) => {
    renderWithProviders(
      <HelpTextContainer
        helpText={'Help text content'}
        {...props}
      />,
    );
  };

  it('receives correct accessible title', () => {
    render();
    expect(
      screen.getByRole('button', {
        name: /Hjelp/i,
      }),
    ).toBeInTheDocument();

    render({ title: 'My labelname' });

    expect(
      screen.getByRole('button', {
        name: /Hjelpetekst for My labelname/i,
      }),
    ).toBeInTheDocument();
  });
});
