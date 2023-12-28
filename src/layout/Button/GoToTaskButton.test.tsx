import React from 'react';

import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { ButtonComponent } from 'src/layout/Button/ButtonComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

const render = async ({ component, genericProps, queries }: Partial<RenderGenericComponentTestProps<'Button'>> = {}) =>
  await renderGenericComponentTest({
    type: 'Button',
    renderer: (props) => <ButtonComponent {...props} />,
    component: {
      mode: 'go-to-task',
      textResourceBindings: {
        title: 'Go to task',
      },
      ...component,
    },
    genericProps,
    queries: {
      fetchProcessNextSteps: () => Promise.resolve(['a', 'b']),
      ...queries,
    },
  });

describe('GoToTaskButton', () => {
  it('should show button and it should be possible to click', async () => {
    const { mutations } = await render({
      component: {
        taskId: 'a',
      },
    });
    expect(screen.getByText('Go to task')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button'));
    expect(mutations.doProcessNext.mock).toHaveBeenCalled();
    expect(mutations.doProcessNext.mock).toHaveBeenCalledWith(
      '512345/75154373-aed4-41f7-95b4-e5b5115c2edc',
      'a',
      'nb',
      undefined,
    );
  });
  it('should show button and it should not be possible to click', async () => {
    const { mutations } = await render({
      component: {
        taskId: 'c',
      },
    });
    expect(screen.getByText('Go to task')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
    await userEvent.click(screen.getByRole('button'));
    expect(mutations.doProcessNext.mock).not.toHaveBeenCalled();
  });
});
