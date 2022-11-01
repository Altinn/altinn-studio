import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import type { IAltinnColumnLayoutProps } from './AltinnColumnLayout';
import AltinnColumnLayoutComponent from './AltinnColumnLayout';

describe('AltinnColumnLayout', () => {
  it('should render title and all children', () => {
    render({
      children: <div data-testid='children' />,
      sideMenuChildren: <div data-testid='sideMenuChildren' />,
      aboveColumnChildren: <div data-testid='aboveColumnChildren' />,
      header: 'Header text',
    });

    expect(screen.getByText('Header text')).toBeInTheDocument();
    expect(screen.getByTestId('children')).toBeInTheDocument();
    expect(screen.getByTestId('sideMenuChildren')).toBeInTheDocument();
    expect(screen.getByTestId('aboveColumnChildren')).toBeInTheDocument();
  });
});

const render = (props: Partial<IAltinnColumnLayoutProps> = {}) => {
  const allProps = {
    children: <div data-testid='children' />,
    sideMenuChildren: <div data-testid='sideMenuChildren' />,
    aboveColumnChildren: <div data-testid='aboveColumnChildren' />,
    header: 'Header text',
    ...props,
  } as IAltinnColumnLayoutProps;

  rtlRender(<AltinnColumnLayoutComponent {...allProps} />);
};
