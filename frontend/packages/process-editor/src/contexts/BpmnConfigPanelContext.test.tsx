import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  BpmnConfigPanelFormContextProvider,
  useBpmnConfigPanelFormContext,
} from './BpmnConfigPanelContext';

describe('BpmnConfigPanelContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should render children', () => {
    render(
      <BpmnConfigPanelFormContextProvider>
        <button>My button</button>
      </BpmnConfigPanelFormContextProvider>,
    );

    expect(screen.getByRole('button', { name: 'My button' })).toBeInTheDocument();
  });

  it('should provide a useBpmnConfigPanelFormContext hook', () => {
    const TestComponent = () => {
      const { metaDataForm } = useBpmnConfigPanelFormContext();
      return <div data-testid='context'>{JSON.stringify(metaDataForm)}</div>;
    };

    render(
      <BpmnConfigPanelFormContextProvider>
        <TestComponent />
      </BpmnConfigPanelFormContextProvider>,
    );

    expect(screen.getByTestId('context')).toHaveTextContent('');
  });

  it('should throw an error when useBpmnConfigPanelFormContext is used outside of a BpmnConfigPanelFormContextProvider', () => {
    // Mock console error to check if it has been called
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const TestComponent = () => {
      useBpmnConfigPanelFormContext();
      return <div data-testid='context'>Test</div>;
    };

    expect(() => render(<TestComponent />)).toThrowError(
      'useBpmnConfigPanelFormContext must be used within a BpmnConfigPanelContextProvider',
    );
    expect(consoleError).toHaveBeenCalled();
  });

  it('should provide methods for update and reset meta data', async () => {
    const user = userEvent.setup();
    const TestComponent = () => {
      const { metaDataForm, setMetaDataForm, resetForm } = useBpmnConfigPanelFormContext();
      return (
        <div data-testid='context'>
          <button
            onClick={() => setMetaDataForm({ taskIdChanges: [{ oldId: 'old', newId: 'new' }] })}
          >
            Set meta data
          </button>
          <button onClick={resetForm}>Reset meta data</button>
          <div>{metaDataForm ? JSON.stringify(metaDataForm) : 'Empty'}</div>
        </div>
      );
    };

    render(
      <BpmnConfigPanelFormContextProvider>
        <TestComponent />
      </BpmnConfigPanelFormContextProvider>,
    );
    await act(() => user.click(screen.getByRole('button', { name: 'Set meta data' })));
    expect(screen.getByTestId('context')).toHaveTextContent(
      '{"taskIdChanges":[{"oldId":"old","newId":"new"}]}',
    );

    await act(() => user.click(screen.getByRole('button', { name: 'Reset meta data' })));
    expect(screen.getByTestId('context')).toHaveTextContent('Empty');
  });
});
