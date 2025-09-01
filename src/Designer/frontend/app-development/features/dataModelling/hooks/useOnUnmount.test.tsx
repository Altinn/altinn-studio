import React from 'react';
import { render } from '@testing-library/react';
import { useOnUnmount } from './useOnUnmount';

const unmountFunction = jest.fn();

const TestComponent = () => {
  useOnUnmount(() => unmountFunction());
  return <div>Test</div>;
};

describe('useOnUnmount', () => {
  afterEach(jest.clearAllMocks);

  it('Calls the function when the component unmounts', () => {
    const { unmount } = render(<TestComponent />);
    expect(unmountFunction).not.toHaveBeenCalled();
    unmount();
    expect(unmountFunction).toHaveBeenCalledTimes(1);
  });

  it('Does not call the function on rerender', () => {
    const { rerender } = render(<TestComponent />);
    rerender(<TestComponent />);
    expect(unmountFunction).not.toHaveBeenCalled();
  });
});
