import React from 'react';

import { screen } from '@testing-library/react';

import { LommebokComponent } from 'src/layout/Lommebok/LommebokComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

describe('LommebokComponent', () => {
  it('should render the placeholder text', async () => {
    await render();

    expect(screen.getByText('Lommebok')).toBeInTheDocument();
  });

  it('should render the title when supplied', async () => {
    await render({
      component: {
        textResourceBindings: { title: 'Min lommebok' },
      },
    });

    expect(screen.getByText('Min lommebok')).toBeInTheDocument();
    expect(screen.getByText('Lommebok')).toBeInTheDocument();
  });
});

const render = async ({ component, genericProps }: Partial<RenderGenericComponentTestProps<'Lommebok'>> = {}) => {
  await renderGenericComponentTest({
    type: 'Lommebok',
    renderer: (props) => <LommebokComponent {...props} />,
    component: {
      id: 'abc123',
      type: 'Lommebok',
      ...component,
    },
    genericProps,
  });
};
