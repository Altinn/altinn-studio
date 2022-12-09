import React from 'react';

import { render as rtlRender, screen } from '@testing-library/react';

import { ConditionalWrapper } from 'src/components/ConditionalWrapper';

describe('ConditionalWrapper', () => {
  it('should pass children to wrapper callback when condition is true', () => {
    const wrapperCb = jest.fn((children) => <div data-testid='conditional-wrapper'>{children}</div>);
    render({
      condition: true,
      wrapper: wrapperCb,
    });

    expect(wrapperCb).toHaveBeenCalledWith(<div data-testid='children'>Children</div>);
    expect(screen.getByTestId('conditional-wrapper')).toBeInTheDocument();
    expect(screen.getByTestId('children')).toBeInTheDocument();
  });

  it('should not pass children to wrapper callback when condition is false', () => {
    const wrapperCb = jest.fn((children) => <div data-testid='conditional-wrapper'>{children}</div>);
    render({
      condition: false,
      wrapper: wrapperCb,
    });

    expect(wrapperCb).toHaveBeenCalledTimes(0);
    expect(screen.queryByTestId('conditional-wrapper')).not.toBeInTheDocument();
    expect(screen.getByTestId('children')).toBeInTheDocument();
  });
});

const render = (props) => {
  const allProps = {
    condition: false,
    wrapper: (children) => <div data-testid='conditional-wrapper'>{children}</div>,
    ...props,
  };

  return rtlRender(
    <ConditionalWrapper {...allProps}>
      <div data-testid='children'>Children</div>
    </ConditionalWrapper>,
  );
};
