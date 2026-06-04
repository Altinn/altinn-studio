import React from 'react';

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConditionalWrapper } from './ConditionalWrapper';

describe('ConditionalWrapper', () => {
  it('should pass children to wrapper callback when condition is true', () => {
    const wrapperCb = vi.fn((children: React.ReactNode) => (
      <div data-testid='conditional-wrapper'>{children}</div>
    ));
    renderComponent({
      condition: true,
      wrapper: wrapperCb,
    });

    expect(wrapperCb).toHaveBeenCalledWith(<div data-testid='children'>Children</div>);
    expect(screen.getByTestId('conditional-wrapper')).toBeInTheDocument();
    expect(screen.getByTestId('children')).toBeInTheDocument();
  });

  it('should not pass children to wrapper callback when condition is false', () => {
    const wrapperCb = vi.fn((children: React.ReactNode) => (
      <div data-testid='conditional-wrapper'>{children}</div>
    ));
    renderComponent({
      condition: false,
      wrapper: wrapperCb,
    });

    expect(wrapperCb).toHaveBeenCalledTimes(0);
    expect(screen.queryByTestId('conditional-wrapper')).not.toBeInTheDocument();
    expect(screen.getByTestId('children')).toBeInTheDocument();
  });

  it('should pass children to otherwise callback when condition is false', () => {
    const otherwiseCb = vi.fn((children: React.ReactNode) => (
      <div data-testid='otherwise-wrapper'>{children}</div>
    ));
    renderComponent({
      condition: false,
      otherwise: otherwiseCb,
    });

    expect(otherwiseCb).toHaveBeenCalledWith(<div data-testid='children'>Children</div>);
    expect(screen.getByTestId('otherwise-wrapper')).toBeInTheDocument();
    expect(screen.getByTestId('children')).toBeInTheDocument();
  });
});

const renderComponent = (overridingProps: {
  condition?: boolean;
  wrapper?: (children: React.ReactNode) => React.JSX.Element;
  otherwise?: (children: React.ReactNode) => React.JSX.Element;
}) => {
  const allProps: Parameters<typeof ConditionalWrapper>[0] = {
    condition: false,
    wrapper: (children) => <div data-testid='conditional-wrapper'>{children}</div>,
    ...overridingProps,
  };

  return render(
    <ConditionalWrapper {...allProps}>
      <div data-testid='children'>Children</div>
    </ConditionalWrapper>,
  );
};
