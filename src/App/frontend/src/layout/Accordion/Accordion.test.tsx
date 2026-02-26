import React from 'react';

import { jest } from '@jest/globals';
import { screen } from '@testing-library/react';

import { useTextResources } from 'src/features/language/textResources/TextResourcesProvider';
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

const render = ({ title, openByDefault }: { title?: string; openByDefault?: boolean } = {}) => {
  jest.mocked(useTextResources).mockImplementation(() => ({ 'accordion.title': { value: 'This is a title' } }));

  return renderGenericComponentTest<'Accordion'>({
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
  });
};
