import React from 'react';

import { screen } from '@testing-library/react';

import { Alert } from 'src/layout/Alert/Alert';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { CompExternal } from 'src/layout/layout';

describe('Alert', () => {
  it('forwards the title and body bindings to the rendered alert', async () => {
    await render({ title: 'Title for alert', body: 'Body for alert' });
    expect(screen.getByText(/title for alert/i)).toBeInTheDocument();
    expect(screen.getByText(/body for alert/i)).toBeInTheDocument();
  });

  it('announces the alert to screen readers when hidden is an expression', async () => {
    await render({ title: 'title for alert', severity: 'danger', hidden: ['equals', 1, 2] });
    expect(screen.getByRole('alert', { name: /title for alert/i })).toBeInTheDocument();
  });

  it('should not announce as a live region when hidden is not set', async () => {
    await render({ title: 'title for alert', severity: 'danger' });
    expect(screen.queryByRole('alert', { name: /title for alert/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('status', { name: /title for alert/i })).not.toBeInTheDocument();
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
