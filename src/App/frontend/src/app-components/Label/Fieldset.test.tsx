import React from 'react';

import { screen } from '@testing-library/react';

import { Fieldset } from 'src/app-components/Label/Fieldset';
import { renderWithAppComponentsProvider } from 'src/app-components/test/renderWithAppComponentsProvider';

describe('Fieldset', () => {
  it('renders with accessible legend', async () => {
    renderWithAppComponentsProvider(<Fieldset legend='legend test' />);
    const fieldset = screen.getByRole('group', { name: /legend test/i });
    expect(fieldset).toBeInTheDocument();
  });

  it('renders with accessible description', async () => {
    renderWithAppComponentsProvider(
      <Fieldset
        legend='legend test'
        description={<span>description test</span>}
      />,
    );

    const description = screen.getByText('description test');
    expect(description).toBeInTheDocument();
  });

  it('provides an optional indicator', async () => {
    renderWithAppComponentsProvider(
      <Fieldset
        legend='legend test'
        required={false}
        optionalIndicator={<span>(valgfri)</span>}
      />,
    );
    const fieldset = screen.getByRole('group', { name: /legend test \(valgfri\)/i });
    expect(fieldset).toBeInTheDocument();
  });

  it('provides an required indicator', async () => {
    renderWithAppComponentsProvider(
      <Fieldset
        legend='legend test'
        required={true}
        requiredIndicator={<span>*</span>}
      />,
    );
    const fieldset = screen.getByRole('group', { name: /legend test \*/i });
    expect(fieldset).toBeInTheDocument();
  });
});
