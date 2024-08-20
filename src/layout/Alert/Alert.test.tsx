import React from 'react';

import { screen } from '@testing-library/react';

import { Alert } from 'src/layout/Alert/Alert';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { CompExternal } from 'src/layout/layout';

describe('Alert', () => {
  it('should display title', async () => {
    await render({ title: 'Title for alert' });
    expect(screen.getByText(/title for alert/i)).toBeInTheDocument();
  });

  it('should display body', async () => {
    await render({ body: 'Body for alert' });
    expect(screen.getByText(/body for alert/i)).toBeInTheDocument();
  });

  it('should display as role="alert" when hidden is an expression', async () => {
    await render({ title: 'title for alert', hidden: ['equals', 1, 2] });
    expect(screen.getByRole('alert', { name: /title for alert/i })).toBeInTheDocument();
  });

  it('should not display as role="alert" when hidden is not set', async () => {
    await render({ title: 'title for alert' });
    expect(screen.queryByRole('alert', { name: /title for alert/i })).not.toBeInTheDocument();
  });
});

const render = async ({
  severity = 'info',
  hidden,
  title,
  body,
}: Partial<CompExternal<'Alert'>> & { title?: string; body?: string } = {}) =>
  await renderGenericComponentTest<'Alert'>({
    type: 'Alert',
    renderer: (props) => <Alert {...props} />,
    component: {
      id: 'alert-box',
      textResourceBindings: {
        title,
        body,
      },
      severity,
      hidden,
    },
  });
