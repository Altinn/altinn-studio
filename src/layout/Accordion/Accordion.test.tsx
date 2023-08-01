import React from 'react';

import { screen } from '@testing-library/react';

import { Accordion } from 'src/layout/Accordion/Accordion';
import { renderGenericComponentTest } from 'src/testUtils';
import type { ILayoutAccordion } from 'src/layout/Accordion/types';

describe('Accordion', () => {
  it('should display text from textResourceBindings', async () => {
    render({ title: 'Accordion title' });

    expect(await screen.findByRole('heading', { name: /accordion title/i })).toBeInTheDocument();
  });
});

const render = ({ title }: Partial<ILayoutAccordion> & { title?: string } = {}) =>
  renderGenericComponentTest<'Accordion'>({
    type: 'Accordion',
    renderer: (props) => <Accordion {...props} />,
    component: {
      id: 'accordion-test-id',
      textResourceBindings: {
        title,
      },
      children: [],
    },
  });
