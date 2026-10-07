import { render, renderHook, screen } from '@testing-library/react';
import { BpmnContextProvider, useBpmnContext } from './BpmnContext';

describe('BpmnContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should render children', () => {
    render(
      <BpmnContextProvider>
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
      <BpmnContextProvider>
        <TestComponent />
      </BpmnContextProvider>,
    );

    expect(screen.getByTestId('context')).toHaveTextContent('');
  });

  it('should throw an error when useBpmnContext is used outside of a BpmnContextProvider', () => {
    const TestComponent = () => {
      useBpmnContext();
      return <div data-testid='context'>Test</div>;
    };

    expect(() => render(<TestComponent />)).toThrow(
      'useBpmnContext must be used within a BpmnContextProvider',
    );
  });

  it('should throw an error when modelerRef.current is undefined', async () => {
    const wrapper = ({ children }) => <BpmnContextProvider>{children}</BpmnContextProvider>;
    const { result } = renderHook(() => useBpmnContext(), {
      wrapper,
    });
    const { getUpdatedXml } = result.current;
    await expect(async () => await getUpdatedXml()).rejects.toThrow('Modeler not initialized');
  });
});
