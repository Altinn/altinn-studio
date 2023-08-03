import React from 'react';

import { screen } from '@testing-library/react';

import { Alert } from 'src/layout/Alert/Alert';
import { renderGenericComponentTest } from 'src/testUtils';
import type { ExprResolved } from 'src/features/expressions/types';
import type { ILayoutCompAlert } from 'src/layout/Alert/types';

describe('Alert', () => {
  it('should display title', () => {
    render({ title: 'Title for alert' });
    expect(screen.getByText(/title for alert/i)).toBeInTheDocument();
  });

  it('should display body', () => {
    render({ body: 'Body for alert' });
    expect(screen.getByText(/body for alert/i)).toBeInTheDocument();
  });

  it('should display as role="alert" when hidden is false', () => {
    render({ title: 'title for alert', hidden: false });
    expect(screen.getByRole('alert', { name: /title for alert/i })).toBeInTheDocument();
  });

  it('should not display as role="alert" when hidden is true', () => {
    render({ title: 'title for alert', hidden: true });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('should not display as role="alert" when hidden is undefined', () => {
    render({ title: 'title for alert', hidden: undefined });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

const render = ({
  severity = 'info',
  hidden,
  title,
  body,
}: Partial<ExprResolved<ILayoutCompAlert>> & { title?: string; body?: string } = {}) =>
  renderGenericComponentTest<'Alert'>({
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
