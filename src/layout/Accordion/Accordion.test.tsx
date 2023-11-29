import React from 'react';

import { screen } from '@testing-library/react';

import { Accordion } from 'src/layout/Accordion/Accordion';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';

describe('Accordion', () => {
  it('should display text from textResourceBindings', async () => {
    await render({ title: 'Accordion title' });

    expect(await screen.findByRole('heading', { name: /accordion title/i })).toBeInTheDocument();
  });

  it('should display text from textResourceBindings if an ID to a text resource is used as title', async () => {
    await render({ title: 'accordion.title' });

    expect(await screen.findByRole('heading', { name: /this is a title/i })).toBeInTheDocument();
  });
});

const render = async ({ title }: { title?: string } = {}) =>
  await renderGenericComponentTest<'Accordion'>({
    type: 'Accordion',
    renderer: (props) => <Accordion {...props} />,
    component: {
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
