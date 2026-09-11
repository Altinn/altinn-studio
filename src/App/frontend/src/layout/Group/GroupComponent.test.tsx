import React from 'react';

import { screen } from '@testing-library/react';

import { GroupComponent } from 'src/layout/Group/GroupComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

const render = async ({
  component,
  isSummary,
}: Partial<RenderGenericComponentTestProps<'Group'>> & { isSummary?: boolean } = {}) =>
  await renderGenericComponentTest({
    type: 'Group',
    renderer: (props) => (
      <GroupComponent
        baseComponentId={props.baseComponentId}
        isSummary={isSummary}
        renderLayoutComponent={() => null}
      />
    ),
    component: {
      children: [],
      ...component,
    },
  });

describe('GroupComponent', () => {
  it('should render the title and a help text button when a help text is set', async () => {
    await render({
      component: {
        textResourceBindings: { title: 'The group title', help: 'this is the help text' },
      },
    });

    expect(screen.getByText('The group title')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hjelp/i })).toBeInTheDocument();
  });

  it('should not render the help text button when rendered as a summary', async () => {
    await render({
      component: {
        textResourceBindings: { title: 'The group title', help: 'this is the help text' },
      },
      isSummary: true,
    });

    expect(screen.queryByRole('button', { name: /Hjelp/i })).not.toBeInTheDocument();
  });
});
