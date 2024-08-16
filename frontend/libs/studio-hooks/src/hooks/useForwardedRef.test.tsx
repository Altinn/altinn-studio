import React, { createRef, forwardRef } from 'react';
import { useForwardedRef } from './useForwardedRef';
import { render, screen } from '@testing-library/react';

const TestComponent = forwardRef<HTMLButtonElement>(({}, ref) => {
  const internalRef = useForwardedRef(ref);
  return <button ref={internalRef} />;
});

TestComponent.displayName = 'TestComponent';

describe('useForwardedRef', () => {
  it('Forwards a ref object to an internal ref', () => {
    const refObject = createRef<HTMLButtonElement>();
    render(<TestComponent ref={refObject} />);
    const button = screen.getByRole('button');
    const referencedElement = refObject.current;
    expect(referencedElement).toBe(button);
  });

  it('Forwards a callback ref to an internal ref', () => {
    const callbackRef = jest.fn();
    render(<TestComponent ref={callbackRef} />);
    const button = screen.getByRole('button');
    expect(callbackRef).toHaveBeenCalledWith(button);
    expect(callbackRef).toHaveBeenCalledTimes(1);
  });
});
