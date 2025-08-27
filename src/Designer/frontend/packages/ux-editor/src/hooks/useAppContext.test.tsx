import React from 'react';
import { render } from '@testing-library/react';
import { useAppContext } from './useAppContext';

const TestComponent = () => {
  useAppContext();
  return <div>Test</div>;
};

describe('useAppContext', () => {
  it('should throw an error when useAppContext is used outside of a AppContextProvider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<TestComponent />)).toThrow(
      'useAppContext must be used within a AppContextProvider',
    );
    expect(consoleError).toHaveBeenCalled();
  });
});
