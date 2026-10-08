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

  it('provides an optional indicator by default when not required', async () => {
    await render({ required: false });
    const title = screen.getByRole('table', { name: /title test valgfritt description test/i });
    expect(title).toBeInTheDocument();
  });

  it('hides the optional indicator when disabled', async () => {
    await render({ required: false, labelSettings: { optionalIndicator: false } });
    expect(screen.queryByRole('table', { name: /valgfritt/i })).not.toBeInTheDocument();
    expect(screen.getByRole('table', { name: /title test description test/i })).toBeInTheDocument();
  });

  it('provides no indicator when the table has no notion of being required', async () => {
    await render();
    expect(screen.queryByRole('table', { name: /valgfritt|må fylles ut/i })).not.toBeInTheDocument();
  });

  it('provides a required indicator', async () => {
    await render({ required: true });
    const title = screen.getByRole('table', { name: /title test må fylles ut description test/i });
    expect(title).toBeInTheDocument();
  });
});
