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

const actionElementDefaultMock: Action = {
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

  it('should list existing actions in view mode', () => {
    setupBpmnActionModelerMock({
      addNewActionToTaskMock: jest.fn(),
      updateTypeForActionMock: jest.fn(),
      updateActionNameOnActionElementMock: jest.fn(),
      hasActionsAlready: true,
      actionElementMock: {
        ...actionElementDefaultMock,
        action: 'reject',
      },
    });

    renderEditActions();

    const viewModeElement = screen.getByText(
      textMock('process_editor.configuration_panel_actions_action_label', {
        actionIndex: 1,
        actionName: 'reject',
      }),
    );
    expect(viewModeElement).toBeInTheDocument();
  });

  it('should display in edit mode when adding new action', async () => {
    const user = userEvent.setup();
    setupBpmnActionModelerMock({
      addNewActionToTaskMock: jest.fn(),
      createActionElementMock: jest.fn(),
      getExtensionElementsMock: jest.fn(),
      updateActionNameOnActionElementMock: jest.fn(),
      hasActionsAlready: true,
    });
    renderEditActions();

    const addButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_actions_add_new'),
    });
    await user.click(addButton);

    const predefinedActionSelector = screen.getByLabelText(
      textMock('process_editor.configuration_panel_actions_action_selector_label'),
    );
    await waitFor(() => expect(predefinedActionSelector).toBeInTheDocument());
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
  actionElementMock,
}: Partial<BpmnActionModelerMock & { actionElementMock: Action }>) =>
  (BpmnActionModeler as jest.Mock).mockImplementation(() => ({
    addNewActionToTask: addNewActionToTaskMock,
    updateTypeForAction: updateTypeForActionMock,
    updateActionNameOnActionElement: updateActionNameOnActionElementMock,
    createActionElement: createActionElementMock,
    getExtensionElements: getExtensionElementsMock,
    hasActionsAlready,
    getTypeForAction: jest.fn().mockReturnValue('Process'),
    actionElements: {
      action: [actionElementMock || actionElementDefaultMock],
    },
  }));
