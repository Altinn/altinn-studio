import React from 'react';

import { screen } from '@testing-library/react';

import { Fieldset } from 'src/components/form/Fieldset';
import { renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';
import type { FieldsetProps } from 'src/components/form/Fieldset';

describe('Fieldset', () => {
  const render = async (props?: Partial<FieldsetProps>) =>
    await renderWithoutInstanceAndLayout({
      renderer: () => (
        <Fieldset
          legend='legend test'
          description='description test'
          {...props}
        />
      ),
    });

  it('renders with accessible legend', async () => {
    await render();
    const fieldset = screen.getByRole('group', { name: /legend test/i });
    expect(fieldset).toBeInTheDocument();
  });

  it('renders with accessible description', async () => {
    await render();
    const description = screen.getByText('description test');
    expect(description).toBeInTheDocument();
  });

  it('provides an optional indicator', async () => {
    await render({ required: false, labelSettings: { optionalIndicator: true } });
    const fieldset = screen.getByRole('group', { name: /legend test \(valgfri\)/i });
    expect(fieldset).toBeInTheDocument();
  });

  it('provides an required indicator', async () => {
    await render({ required: true });
    const fieldset = screen.getByRole('group', { name: /legend test \*/i });
    expect(fieldset).toBeInTheDocument();
  });
});
