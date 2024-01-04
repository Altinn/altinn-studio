import React from 'react';
import { render } from '@testing-library/react';
import { useOnUnmount } from './useOnUnmount';

const unmountFunction = jest.fn();

const TestComponent = () => {
  useOnUnmount(unmountFunction);
  return <div>Test</div>;
};

describe('useOnUnmount', () => {
  it('Calls the function when the component unmounts', () => {
    const { unmount } = render(<TestComponent />);
    expect(unmountFunction).not.toHaveBeenCalled();
    unmount();
    expect(unmountFunction).toHaveBeenCalledTimes(1);
  });
});
