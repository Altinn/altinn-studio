import React from 'react';
import userEvent from '@testing-library/user-event';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import { render, screen } from '@testing-library/react';
import { mockBpmnDetails, paymentActions } from '../../../../../test/mocks/bpmnDetailsMock';
import { ActionType, EditAction } from './EditAction';
import {
  modelingMock,
  updateModdlePropertiesMock,
} from '../../../../../test/mocks/bpmnModelerMock';
import type { EditActionProps } from './EditAction';

const mockActionElementWrite =
  mockBpmnDetails.element.businessObject.extensionElements.values[0].actions.action[0];
const mockActionElementCustomServer =
  mockBpmnDetails.element.businessObject.extensionElements.values[0].actions.action[1];
const mockActionElementCustomProcess =
  mockBpmnDetails.element.businessObject.extensionElements.values[0].actions.action[2];
const mockAvailablePredefinedActions = ['reject', 'confirm'];
const defaultEditActionProps: EditActionProps = {
  actionElementToEdit: mockActionElementWrite,
  availablePredefinedActions: mockAvailablePredefinedActions,
  bpmnDetails: mockBpmnDetails,
  index: 0,
  modeling: modelingMock as any,
};

describe('EditAction', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('should render a defined action as read only by default when action is required for task', () => {
    const mockActionElementPay = paymentActions.actions.action[0];
    renderEditAction({
      ...defaultEditActionProps,
      bpmnDetails: {
        ...mockBpmnDetails,
        taskType: 'payment',
      },
      actionElementToEdit: mockActionElementPay,
    });
    const definedAction = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_actions_action_label', {
        actionIndex: defaultEditActionProps.index + 1,
        actionName: mockActionElementPay.action,
      }),
    });
    expect(definedAction).toHaveAttribute('aria-readonly');
  });

  it('should render a defined action by default when action is set', () => {
    renderEditAction();
    expect(
      screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_actions_action_label', {
          actionIndex: defaultEditActionProps.index + 1,
          actionName: mockActionElementWrite.action,
        }),
      }),
    ).toBeInTheDocument();
  });

  it('should render help text for custom action', async () => {
    const user = userEvent.setup();
    renderEditAction({
      ...defaultEditActionProps,
      actionElementToEdit: mockActionElementCustomServer,
    });
    const openEditModeButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_actions_action_label', {
        actionIndex: defaultEditActionProps.index + 1,
        actionName: mockActionElementCustomServer.action,
      }),
    });
    await user.click(openEditModeButton);
    const helpTextButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_actions_action_type_help_text'),
    });
    await user.click(helpTextButton);
    expect(
      screen.getByText(
        textMock('process_editor.configuration_panel_actions_set_server_action_info'),
      ),
    ).toBeInTheDocument();
  });

  it('should render save button as disabled when clicking an option', async () => {
    const user = userEvent.setup();
    renderEditAction({
      ...defaultEditActionProps,
      actionElementToEdit: mockActionElementCustomServer,
    });
    const openEditModeButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_actions_action_label', {
        actionIndex: defaultEditActionProps.index + 1,
        actionName: mockActionElementCustomServer.action,
      }),
    });
    await user.click(openEditModeButton);
    const helpTextButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_actions_action_type_help_text'),
    });
    await user.click(helpTextButton);
    expect(
      screen.getByText(
        textMock('process_editor.configuration_panel_actions_set_server_action_info'),
      ),
    ).toBeInTheDocument();
  });

  it('should render switch that is enabled for an existing server action', async () => {
    const user = userEvent.setup();
    renderEditAction({
      ...defaultEditActionProps,
      actionElementToEdit: mockActionElementCustomServer,
    });
    const openEditModeButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_actions_action_label', {
        actionIndex: defaultEditActionProps.index + 1,
        actionName: mockActionElementCustomServer.action,
      }),
    });
    await user.click(openEditModeButton);
    const serverActionSwitch = screen.getByRole('checkbox', {
      name: `set_server_type_for_${mockActionElementCustomServer.action}_action`,
    });
    expect(serverActionSwitch).toBeInTheDocument();
    expect(serverActionSwitch).toBeChecked();
  });

  it('should render switch that is not checked for a task that has an existing custom processAction', async () => {
    const user = userEvent.setup();
    renderEditAction({
      ...defaultEditActionProps,
      actionElementToEdit: mockActionElementCustomProcess,
    });
    const openEditModeButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_actions_action_label', {
        actionIndex: defaultEditActionProps.index + 1,
        actionName: mockActionElementCustomProcess.action,
      }),
    });
    await user.click(openEditModeButton);
    const processActionSwitch = screen.getByRole('checkbox', {
      name: `set_server_type_for_${mockActionElementCustomProcess.action}_action`,
    });
    expect(processActionSwitch).toBeInTheDocument();
    expect(processActionSwitch).not.toBeChecked();
  });

  it('should call updateModdleProperties on modeling with actionType=server when setting serverAction', async () => {
    const user = userEvent.setup();
    renderEditAction({
      ...defaultEditActionProps,
      actionElementToEdit: mockActionElementCustomProcess,
    });
    expect(mockActionElementCustomProcess.type).toBe(ActionType.Process);
    const openEditModeButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_actions_action_label', {
        actionIndex: defaultEditActionProps.index + 1,
        actionName: mockActionElementCustomProcess.action,
      }),
    });
    await user.click(openEditModeButton);
    const actionTypeSwitch = screen.getByRole('checkbox', {
      name: `set_server_type_for_${mockActionElementCustomProcess.action}_action`,
    });
    await user.click(actionTypeSwitch);
    expect(updateModdlePropertiesMock).toHaveBeenCalledTimes(1);
    expect(updateModdlePropertiesMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        actions: expect.objectContaining({
          action: expect.arrayContaining([
            { action: mockActionElementCustomProcess.action, type: ActionType.Server },
          ]),
        }),
      }),
    );
  });

  it('should call updateModdleProperties on modeling with actionType=process when unsetting serverAction', async () => {
    const user = userEvent.setup();
    renderEditAction({
      ...defaultEditActionProps,
      actionElementToEdit: mockActionElementCustomServer,
    });
    expect(mockActionElementCustomServer.type).toBe(ActionType.Server);
    const openEditModeButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_actions_action_label', {
        actionIndex: defaultEditActionProps.index + 1,
        actionName: mockActionElementCustomServer.action,
      }),
    });
    await user.click(openEditModeButton);
    const actionTypeSwitch = screen.getByRole('checkbox', {
      name: `set_server_type_for_${mockActionElementCustomServer.action}_action`,
    });
    await user.click(actionTypeSwitch);
    expect(updateModdlePropertiesMock).toHaveBeenCalledTimes(1);
    expect(updateModdlePropertiesMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        actions: expect.objectContaining({
          action: expect.arrayContaining([
            { action: mockActionElementCustomServer.action, type: ActionType.Process },
          ]),
        }),
      }),
    );
  });

  it('should call updateModdleProperties on modeling with new action name when typing a new action in combobox', async () => {
    const user = userEvent.setup();
    const newActionNameCustom = 'myCustomAction';
    renderEditAction();
    const openEditModeButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_actions_action_label', {
        actionIndex: defaultEditActionProps.index + 1,
        actionName: mockActionElementWrite.action,
      }),
    });
    await user.click(openEditModeButton);
    const combobox = screen.getByTitle(`combobox_${mockActionElementWrite.action}`);
    await user.clear(combobox);
    await user.type(combobox, newActionNameCustom);
    await user.tab();
    const saveButton = screen.getByRole('button', { name: textMock('general.save') });
    await user.click(saveButton);
    expect(updateModdlePropertiesMock).toHaveBeenCalledTimes(1);
    expect(updateModdlePropertiesMock).toHaveBeenCalledWith(
      mockBpmnDetails.element,
      mockActionElementWrite,
      {
        action: newActionNameCustom,
      },
    );
  });

  it('should call updateModdleProperties on modeling with new action name and deleted action type when changing a custom action to a predefined', async () => {
    const user = userEvent.setup();
    const newActionNameReject = 'reject';
    renderEditAction({
      ...defaultEditActionProps,
      actionElementToEdit: {
        action: mockActionElementCustomServer.action,
        type: ActionType.Server,
      },
    });
    const openEditModeButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_actions_action_label', {
        actionIndex: defaultEditActionProps.index + 1,
        actionName: mockActionElementCustomServer.action,
      }),
    });
    await user.click(openEditModeButton);
    const combobox = screen.getByTitle(`combobox_${mockActionElementCustomServer.action}`);
    await user.click(combobox);
    await user.clear(combobox);
    const actionOption = screen.getByRole('option', { name: newActionNameReject });
    await user.click(actionOption);
    const saveButton = await screen.findByRole('button', { name: textMock('general.save') });
    await user.click(saveButton);
    expect(updateModdlePropertiesMock).toHaveBeenCalledTimes(1);
    expect(updateModdlePropertiesMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: mockActionElementCustomServer.action }) &&
        expect.not.objectContaining({ type: mockActionElementCustomServer.type }),
      { action: newActionNameReject },
    );
  });

  it('should call updateModdleProperties on modeling without specific action when deleting an action', async () => {
    const user = userEvent.setup();
    renderEditAction();
    const openEditModeButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_actions_action_label', {
        actionIndex: defaultEditActionProps.index + 1,
        actionName: mockActionElementWrite.action,
      }),
    });
    await user.click(openEditModeButton);
    const deleteButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_actions_delete_action', {
        actionName: mockActionElementWrite.action,
      }),
    });
    await user.click(deleteButton);
    expect(updateModdlePropertiesMock).toHaveBeenCalledTimes(1);
    expect(updateModdlePropertiesMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        actions:
          expect.objectContaining({ mockActionElementCustomServer }) &&
          expect.objectContaining({ mockActionElementCustomProcess }) &&
          expect.not.objectContaining({ mockActionElementWrite }),
      }),
    );
  });

  it('should call updateModdleProperties on modeling without any actions when deleting the only existing one', async () => {
    const user = userEvent.setup();
    renderEditAction({
      ...defaultEditActionProps,
      bpmnDetails: {
        ...mockBpmnDetails,
        element: {
          businessObject: {
            extensionElements: {
              values: [
                {
                  actions: {
                    action: [mockActionElementWrite],
                  },
                },
              ],
            },
          },
        },
      },
    });
    const openEditModeButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_actions_action_label', {
        actionIndex: defaultEditActionProps.index + 1,
        actionName: mockActionElementWrite.action,
      }),
    });
    await user.click(openEditModeButton);
    const deleteButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_actions_delete_action', {
        actionName: mockActionElementWrite.action,
      }),
    });
    await user.click(deleteButton);
    expect(updateModdlePropertiesMock).toHaveBeenCalledTimes(1);
    expect(updateModdlePropertiesMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        actions: undefined,
      }),
    );
  });

  it('should not call updateModdleProperties on modeling when selecting the current action', async () => {
    const user = userEvent.setup();
    const newActionNameWrite = 'write';
    renderEditAction();
    const openEditModeButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_actions_action_label', {
        actionIndex: defaultEditActionProps.index + 1,
        actionName: mockActionElementWrite.action,
      }),
    });
    await user.click(openEditModeButton);
    const combobox = screen.getByTitle(`combobox_${mockActionElementWrite.action}`);
    await user.clear(combobox);
    const actionOption = screen.getByRole('option', { name: newActionNameWrite });
    await user.click(actionOption);
    expect(updateModdlePropertiesMock).not.toHaveBeenCalled();
  });
});

const renderEditAction = (editActionProps: EditActionProps = defaultEditActionProps) => {
  return render(<EditAction {...editActionProps} />);
};
