import { describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import type { ChangeEvent } from 'react';
import { renderHook } from '@testing-library/react';
import { useActionHandler } from './useOnActionChange';
import { BpmnContext } from '../../../../../../contexts/BpmnContext';
import { mockBpmnContextValue } from '../../../../../../../test/mocks/bpmnContextMock';
import {
  type Action,
  BpmnActionModeler,
} from '../../../../../../utils/bpmnModeler/BpmnActionModeler';
import { BpmnConfigPanelFormContextProvider } from '../../../../../../contexts/BpmnConfigPanelContext';

vi.mock('../../../../../../utils/bpmnModeler/BpmnActionModeler');

const actionElementMock: Action = {
  $type: 'altinn:Action',
  action: 'reject',
};

describe('useOnActionChange', () => {
  it('should add action to task if no actions is already defined', async () => {
    const addNewActionToTaskMock = vi.fn();
    (BpmnActionModeler as Mock).mockImplementation(function () {
      return {
        hasActionsAlready: false,
        addNewActionToTask: addNewActionToTaskMock,
      };
    });

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
    const updateActionNameOnActionElementMock = vi.fn();
    (BpmnActionModeler as Mock).mockImplementation(function () {
      return {
        hasActionsAlready: true,
        updateActionNameOnActionElement: updateActionNameOnActionElementMock,
      };
    });

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
