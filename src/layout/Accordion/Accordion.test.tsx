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

  it('should open accordion by default if openByDefault is set to true', async () => {
    const { container } = await render({ openByDefault: true });
    const element = container.querySelector('.fds-animate-height') as HTMLElement;
    expect(element).toHaveClass('fds-animate-height--open');
    expect(element).not.toHaveClass('fds-animate-height--closed');
  });

  it('accordion should be closed by default if openByDefault is set to false', async () => {
    const { container } = await render({ openByDefault: false });
    const element = container.querySelector('.fds-animate-height') as HTMLElement;
    expect(element).toHaveClass('fds-animate-height--closed');
    expect(element).not.toHaveClass('fds-animate-height--open');
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
