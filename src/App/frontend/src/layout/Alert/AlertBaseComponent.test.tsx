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
});
