import React from 'react';

import { screen } from '@testing-library/react';

import { Caption } from 'src/components/form/Caption';
import { renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';

describe('Caption', () => {
  const render = async (props) =>
    await renderWithoutInstanceAndLayout({
      renderer: () => (
        <table>
          <Caption
            title='title test'
            description='description test'
            {...props}
          />
        </table>
      ),
    });

  it('provides table with accessible title', async () => {
    await render({});
    const title = screen.getByRole('table', { name: /title test description test/i });
    expect(title).toBeInTheDocument();
  });

  it('provides an optional indicator', async () => {
    await render({ requried: false, labelSettings: { optionalIndicator: true } });
    const title = screen.getByRole('table', { name: /title test \(valgfri\) description test/i });
    expect(title).toBeInTheDocument();
  });

  it('provides an required indicator', async () => {
    await render({ required: true });
    const title = screen.getByRole('table', { name: /title test \* description test/i });
    expect(title).toBeInTheDocument();
  });
});
