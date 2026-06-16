import React from 'react';

import { render as rtlRender, screen } from '@testing-library/react';

import { AlertBaseComponent } from 'src/layout/Alert/AlertBaseComponent';
import type { AlertBaseComponentProps } from 'src/layout/Alert/AlertBaseComponent';

const defaultProps: AlertBaseComponentProps = {
  severity: 'info',
};

const render = (props: Partial<AlertBaseComponentProps> = {}) =>
  rtlRender(
    <AlertBaseComponent
      {...defaultProps}
      {...props}
    />,
  );

describe('Alert', () => {
  it('should display title', () => {
    render({ title: 'Title for alert' });
    expect(screen.getByText(/title for alert/i)).toBeInTheDocument();
  });

  it('should display children', () => {
    render({ children: 'Description for alert' });
    expect(screen.getByText(/description for alert/i)).toBeInTheDocument();
  });

  it('should not set role or aria-live when not used as a screen reader alert', () => {
    const { container } = render({ useAsAlert: false, title: 'Title for alert' });
    const alert = container.firstElementChild;
    expect(alert).not.toHaveAttribute('role');
    expect(alert).not.toHaveAttribute('aria-live');
  });

  it.each(['warning', 'danger'] as const)('should use role="alert" for the critical severity "%s"', (severity) => {
    render({ useAsAlert: true, severity, title: 'Title for alert' });
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it.each(['info', 'success'] as const)('should use role="status" for the non-critical severity "%s"', (severity) => {
    render({ useAsAlert: true, severity, title: 'Title for alert' });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should not combine role with an explicit aria-live (avoids VoiceOver double-speak)', () => {
    render({ useAsAlert: true, severity: 'danger', title: 'Title for alert' });
    expect(screen.getByRole('alert')).not.toHaveAttribute('aria-live');
  });
});
