import React, { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
      const { metaDataFormRef } = useBpmnConfigPanelFormContext();
      return <div data-testid='context'>{JSON.stringify(metaDataFormRef.current)}</div>;
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

    expect(() => render(<TestComponent />)).toThrow(
      'useBpmnConfigPanelFormContext must be used within a BpmnConfigPanelContextProvider',
    );
    expect(consoleError).toHaveBeenCalled();
  });

  it('should provide method to reset meta data', async () => {
    const user = userEvent.setup();
    const TestComponent = () => {
      const { metaDataFormRef, resetForm } = useBpmnConfigPanelFormContext();
      // Need to update state to trigger a rerender since metaDataFormRef is a mutable object that does not trigger rerender
      const [, setState] = useState(undefined);

      const handleSetMetaData = () => {
        setState('test');
        metaDataFormRef.current = { taskIdChanges: [{ oldId: 'old', newId: 'new' }] };
      };

      const handleResetMetaData = () => {
        setState(undefined);
        resetForm();
      };

      return (
        <div>
          <button onClick={handleSetMetaData}>Set meta data</button>
          <button onClick={handleResetMetaData}>Reset meta data</button>
          <div data-testid='context'>
            {metaDataFormRef.current ? JSON.stringify(metaDataFormRef.current) : 'Empty'}
          </div>
        </div>
      );
    };

    render(
      <BpmnConfigPanelFormContextProvider>
        <TestComponent />
      </BpmnConfigPanelFormContextProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Set meta data' }));
    await waitFor(() =>
      expect(screen.getByTestId('context')).toHaveTextContent(
        '{"taskIdChanges":[{"oldId":"old","newId":"new"}]}',
      ),
    );

    await user.click(screen.getByRole('button', { name: 'Reset meta data' }));
    expect(screen.getByTestId('context')).toHaveTextContent('Empty');
  });
});
