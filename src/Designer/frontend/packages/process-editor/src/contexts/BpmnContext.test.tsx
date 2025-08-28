import React from 'react';
import { render, renderHook, screen } from '@testing-library/react';
import { BpmnContextProvider, useBpmnContext } from './BpmnContext';

describe('BpmnContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should render children', () => {
    render(
      <BpmnContextProvider appLibVersion={'8.0.0'}>
        <button>My button</button>
      </BpmnContextProvider>,
    );

    expect(screen.getByRole('button', { name: 'My button' })).toBeInTheDocument();
  });

  it('should provide a useBpmnContext hook', () => {
    const TestComponent = () => {
      const {} = useBpmnContext();
      return <div data-testid='context'></div>;
    };

    render(
      <BpmnContextProvider appLibVersion={'8.0.0'}>
        <TestComponent />
      </BpmnContextProvider>,
    );

    expect(screen.getByTestId('context')).toHaveTextContent('');
  });

  it('should throw an error when useBpmnContext is used outside of a BpmnContextProvider', () => {
    // Mock console error to check if it has been called
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const TestComponent = () => {
      useBpmnContext();
      return <div data-testid='context'>Test</div>;
    };

    expect(() => render(<TestComponent />)).toThrow(
      'useBpmnContext must be used within a BpmnContextProvider',
    );
    expect(consoleError).toHaveBeenCalled();
  });

  it('should throw an error when modelerRef.current is undefined', async () => {
    const wrapper = ({ children }) => (
      <BpmnContextProvider appLibVersion={'8.0.0'}>{children}</BpmnContextProvider>
    );
    const { result } = renderHook(() => useBpmnContext(), {
      wrapper,
    });
    const { getUpdatedXml } = result.current;
    await expect(async () => await getUpdatedXml()).rejects.toThrow('Modeler not initialized');
  });
});
