import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import type { IAltinnColumnLayoutProps } from './AltinnColumnLayout';
import { AltinnColumnLayout } from './AltinnColumnLayout';

describe('AltinnColumnLayout', () => {
  it('should render title and all children', () => {
    render({
      children: <div data-testid='children' />,
      sideMenuChildren: <div data-testid='sideMenuChildren' />,
      header: 'Header text',
    });

    expect(screen.getByText('Header text')).toBeInTheDocument();
    expect(screen.getByTestId('children')).toBeInTheDocument();
    expect(screen.getByTestId('sideMenuChildren')).toBeInTheDocument();
  });
});

const render = (props: Partial<IAltinnColumnLayoutProps> = {}) => {
  const allProps = {
    children: <div data-testid='children' />,
    sideMenuChildren: <div data-testid='sideMenuChildren' />,
    header: 'Header text',
    ...props,
  } as IAltinnColumnLayoutProps;

  rtlRender(<AltinnColumnLayout {...allProps}>{allProps.children}</AltinnColumnLayout>);
};
