import React, { type ChangeEvent } from 'react';
import { renderHook } from '@testing-library/react';
import { useActionHandler } from './useOnActionChange';
import { BpmnContext } from '../../../../../../contexts/BpmnContext';
import { mockBpmnContextValue } from '../../../../../../../test/mocks/bpmnContextMock';
import {
  type Action,
  BpmnActionModeler,
} from '../../../../../../utils/bpmnModeler/BpmnActionModeler';
import { BpmnConfigPanelFormContextProvider } from '../../../../../../contexts/BpmnConfigPanelContext';

jest.mock('../../../../../../utils/bpmnModeler/BpmnActionModeler');

const actionElementMock: Action = {
  $type: 'altinn:Action',
  action: 'reject',
};

describe('useOnActionChange', () => {
  it('should add action to task if no actions is already defined', async () => {
    const addNewActionToTaskMock = jest.fn();
    (BpmnActionModeler as jest.Mock).mockImplementation(() => ({
      hasActionsAlready: false,
      addNewActionToTask: addNewActionToTaskMock,
    }));

    const { result } = renderHook(() => useActionHandler(actionElementMock), {
      wrapper: ({ children }) => (
        <BpmnContext.Provider value={mockBpmnContextValue}>
          <BpmnConfigPanelFormContextProvider>{children}</BpmnConfigPanelFormContextProvider>
        </BpmnContext.Provider>
      ),
    });

    const event = {
      target: {
        value: 'approve',
      },
    } as ChangeEvent<HTMLSelectElement | HTMLInputElement>;

    result.current.handleOnActionChange(event);
    expect(addNewActionToTaskMock).toHaveBeenCalledTimes(1);
  });

  it('should update action name on action element if actions is already defined', async () => {
    const updateActionNameOnActionElementMock = jest.fn();
    (BpmnActionModeler as jest.Mock).mockImplementation(() => ({
      hasActionsAlready: true,
      updateActionNameOnActionElement: updateActionNameOnActionElementMock,
    }));

    const { result } = renderHook(() => useActionHandler(actionElementMock), {
      wrapper: ({ children }) => (
        <BpmnContext.Provider value={mockBpmnContextValue}>
          <BpmnConfigPanelFormContextProvider>{children}</BpmnConfigPanelFormContextProvider>
        </BpmnContext.Provider>
      ),
    });

    const event = {
      target: {
        value: 'approve',
      },
    } as ChangeEvent<HTMLSelectElement | HTMLInputElement>;

    result.current.handleOnActionChange(event);
    expect(updateActionNameOnActionElementMock).toHaveBeenCalledTimes(1);
  });
});
