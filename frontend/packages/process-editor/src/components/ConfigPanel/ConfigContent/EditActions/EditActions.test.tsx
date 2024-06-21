import React from 'react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { render, screen, waitFor } from '@testing-library/react';
import { EditActions } from './EditActions';
import { BpmnContext } from '../../../../contexts/BpmnContext';
import { mockBpmnContextValue } from '../../../../../test/mocks/bpmnContextMock';
import { type Action, BpmnActionModeler } from '../../../../utils/bpmn/BpmnActionModeler';
import { BpmnConfigPanelFormContextProvider } from '../../../../contexts/BpmnConfigPanelContext';

jest.mock('../../../../utils/bpmn/BpmnActionModeler');

const actionElementMock: Action = {
  $type: 'altinn:Action',
};

describe('EditActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should add new action if actions not already exists', async () => {
    const user = userEvent.setup();

    const addNewActionToTaskMock = jest.fn();
    const updateTypeForActionMock = jest.fn();
    const updateActionNameOnActionElementMock = jest.fn();
    setupBpmnActionModelerMock({
      addNewActionToTaskMock,
      updateTypeForActionMock,
      updateActionNameOnActionElementMock,
    });

    renderEditActions();
    const addButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_actions_add_new'),
    });

    await user.click(addButton);
    await waitFor(() => expect(addNewActionToTaskMock).toHaveBeenCalledTimes(1));
    expect(
      screen.getByText(
        textMock('process_editor.configuration_panel_actions_action_card_title', {
          actionIndex: 1,
        }),
      ),
    );
  });

  it('should append new action if actions already exists', async () => {
    const user = userEvent.setup();

    const addNewActionToTaskMock = jest.fn();
    const updateTypeForActionMock = jest.fn();
    const updateActionNameOnActionElementMock = jest.fn();
    const createActionElementMock = jest.fn();
    const getExtensionElementsMock = jest.fn();
    setupBpmnActionModelerMock({
      addNewActionToTaskMock,
      updateTypeForActionMock,
      updateActionNameOnActionElementMock,
      getExtensionElementsMock,
      createActionElementMock: createActionElementMock,
      hasActionsAlready: true,
    });

    renderEditActions();
    const addButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_actions_add_new'),
    });

    await user.click(addButton);

    await waitFor(() => expect(updateActionNameOnActionElementMock).toHaveBeenCalledTimes(1));
  });
});

const renderEditActions = () => {
  return render(
    <BpmnContext.Provider value={mockBpmnContextValue}>
      <BpmnConfigPanelFormContextProvider>
        <EditActions />
      </BpmnConfigPanelFormContextProvider>
    </BpmnContext.Provider>,
  );
};

type BpmnActionModelerMock = {
  addNewActionToTaskMock: jest.Mock;
  updateTypeForActionMock: jest.Mock;
  updateActionNameOnActionElementMock: jest.Mock;
  hasActionsAlready: boolean;
  createActionElementMock: jest.Mock;
  getExtensionElementsMock: jest.Mock;
};
const setupBpmnActionModelerMock = ({
  addNewActionToTaskMock,
  updateTypeForActionMock,
  updateActionNameOnActionElementMock,
  hasActionsAlready,
  createActionElementMock,
  getExtensionElementsMock,
}: Partial<BpmnActionModelerMock>) =>
  (BpmnActionModeler as jest.Mock).mockImplementation(() => ({
    addNewActionToTask: addNewActionToTaskMock,
    updateTypeForAction: updateTypeForActionMock,
    updateActionNameOnActionElement: updateActionNameOnActionElementMock,
    createActionElement: createActionElementMock,
    getExtensionElements: getExtensionElementsMock,
    hasActionsAlready,
    getTypeForAction: jest.fn().mockReturnValue('Process'),
    actionElements: {
      action: [actionElementMock],
    },
  }));
