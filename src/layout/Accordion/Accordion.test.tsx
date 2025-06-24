import React from 'react';

import { screen } from '@testing-library/react';

import { Accordion } from 'src/layout/Accordion/Accordion';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';

describe('Accordion', () => {
  it('should display text from textResourceBindings', async () => {
    await render({ title: 'Accordion title' });

    expect(await screen.findByRole('button', { name: /accordion title/i })).toBeInTheDocument();
  });

  it('should display text from textResourceBindings if an ID to a text resource is used as title', async () => {
    await render({ title: 'accordion.title' });

    expect(await screen.findByRole('button', { name: /this is a title/i })).toBeInTheDocument();
  });

  it('should open accordion by default if openByDefault is set to true', async () => {
    await render({ openByDefault: true, title: 'accordion.title' });
    expect(await screen.findByRole('button', { name: /this is a title/i })).toHaveAttribute('aria-expanded', 'true');
  });

  it('accordion should be closed by default if openByDefault is set to false', async () => {
    await render({ openByDefault: false, title: 'accordion.title' });
    expect(await screen.findByRole('button', { name: /this is a title/i })).toHaveAttribute('aria-expanded', 'false');
  });
});

const render = async ({ title, openByDefault }: { title?: string; openByDefault?: boolean } = {}) =>
  await renderGenericComponentTest<'Accordion'>({
    type: 'Accordion',
    renderer: (props) => <Accordion {...props} />,
    component: {
      openByDefault,
      id: 'accordion-test-id',
      textResourceBindings: {
        title,
      },
      children: [],
    },
    queries: {
      fetchTextResources: async () => ({
        language: 'nb',
        resources: [
          {
            id: 'accordion.title',
            value: 'This is a title',
          },
        ],
      }),
    },
  });
