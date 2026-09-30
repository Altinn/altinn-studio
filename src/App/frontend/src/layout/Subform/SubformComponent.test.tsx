import React from 'react';

import { screen } from '@testing-library/react';

import { SubformComponent } from 'src/layout/Subform/SubformComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

const render = async ({ component }: Partial<RenderGenericComponentTestProps<'Subform'>> = {}) =>
  await renderGenericComponentTest({
    type: 'Subform',
    renderer: (props) => <SubformComponent {...props} />,
    component: {
      layoutSet: 'subform-layout',
      tableColumns: [],
      textResourceBindings: { title: 'The subform title' },
      ...component,
    },
  });

describe('SubformComponent', () => {
  it('should render the title and a help text button when a help text is set', async () => {
    await render({
      component: {
        textResourceBindings: { title: 'The subform title', help: 'this is the help text' },
      },
    });

    expect(screen.getByText('The subform title')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hjelp/i })).toBeInTheDocument();
  });
});
