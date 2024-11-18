import React from 'react';

import { screen } from '@testing-library/react';

import { Caption } from 'src/components/form/caption/Caption';
import { renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';
import type { CaptionProps } from 'src/components/form/caption/Caption';

describe('Caption', () => {
  const render = async (props?: Partial<CaptionProps>) =>
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
    await render();
    const title = screen.getByRole('table', { name: /title test description test/i });
    expect(title).toBeInTheDocument();
  });

  it('provides an optional indicator', async () => {
    await render({ required: false, labelSettings: { optionalIndicator: true } });
    const title = screen.getByRole('table', { name: /title test \(valgfri\) description test/i });
    expect(title).toBeInTheDocument();
  });

  it('provides an required indicator', async () => {
    await render({ required: true });
    const title = screen.getByRole('table', { name: /title test \* description test/i });
    expect(title).toBeInTheDocument();
  });
});
