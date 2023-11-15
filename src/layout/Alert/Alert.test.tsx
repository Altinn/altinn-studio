import React from 'react';

import { screen } from '@testing-library/react';

import { Alert } from 'src/layout/Alert/Alert';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { CompAlertInternal } from 'src/layout/Alert/config.generated';

describe('Alert', () => {
  it('should display title', async () => {
    await render({ title: 'Title for alert' });
    expect(screen.getByText(/title for alert/i)).toBeInTheDocument();
  });

  it('should display body', async () => {
    await render({ body: 'Body for alert' });
    expect(screen.getByText(/body for alert/i)).toBeInTheDocument();
  });

  it('should display as role="alert" when hidden is false', async () => {
    await render({ title: 'title for alert', hidden: false });
    expect(screen.getByRole('alert', { name: /title for alert/i })).toBeInTheDocument();
  });

  it('should not display as role="alert" when hidden is true', async () => {
    await render({ title: 'title for alert', hidden: true });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('should not display as role="alert" when hidden is undefined', async () => {
    await render({ title: 'title for alert', hidden: undefined });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

const render = async ({
  severity = 'info',
  hidden,
  title,
  body,
}: Partial<CompAlertInternal> & { title?: string; body?: string } = {}) =>
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
