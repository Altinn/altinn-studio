import React from 'react';
import { render, renderHook, screen, waitFor, act } from '@testing-library/react';
import { PreviewContextProvider, usePreviewContext } from './PreviewContext';

describe('PreviewContext', () => {
  it('should render children', () => {
    render(
      <PreviewContextProvider>
        <button>My button</button>
      </PreviewContextProvider>,
    );

    expect(screen.getByRole('button', { name: 'My button' })).toBeInTheDocument();
  });

  it('should provide a usePreviewContext hook', () => {
    const TestComponent = () => {
      const {} = usePreviewContext();
      return <div data-testid='context'></div>;
    };

    render(
      <PreviewContextProvider>
        <TestComponent />
      </PreviewContextProvider>,
    );

    expect(screen.getByTestId('context')).toHaveTextContent('');
  });

  it('should throw an error when usePreviewContext is used outside of a PreviewContextProvider', () => {
    // Mock console error to check if it has been called
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const TestComponent = () => {
      usePreviewContext();
      return <div data-testid='context'>Test</div>;
    };

    expect(() => render(<TestComponent />)).toThrow(
      'usePreviewContext must be used within a PreviewContextProvider',
    );
    expect(consoleError).toHaveBeenCalled();
  });

  it('should toggle the shouldReloadPreview between true and false when doReload and hasReloaded is invoked', async () => {
    const { result } = renderHook(() => usePreviewContext(), {
      wrapper: PreviewContextProvider,
    });

    const { shouldReloadPreview, doReloadPreview, previewHasLoaded } = result.current;
    expect(shouldReloadPreview).toBe(false);

    act(doReloadPreview);
    await waitFor(() => {
      expect(result.current.shouldReloadPreview).toBe(true);
    });

    act(previewHasLoaded);
    await waitFor(() => {
      expect(result.current.shouldReloadPreview).toBe(false);
    });
  });
});
