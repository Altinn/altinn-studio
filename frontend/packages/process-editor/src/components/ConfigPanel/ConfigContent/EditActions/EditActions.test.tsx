import React from 'react';
import { render, screen } from '@testing-library/react';
import { ActionType, EditActions } from './EditActions';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import {
  confirmationActions,
  mockBpmnDetails,
  signingActions,
} from '../../../../../test/mocks/bpmnDetailsMock';
import {
  createMock,
  mockModelerRef,
  updateModdlePropertiesMock,
} from '../../../../../test/mocks/bpmnModelerMock';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import type { BpmnDetails } from '../../../../types/BpmnDetails';
import type { BpmnTaskType } from '../../../../types/BpmnTaskType';
import userEvent from '@testing-library/user-event';
import { ObjectUtils } from '@studio/pure-functions';

const actionsForTaskTypes = { confirmation: confirmationActions, signing: signingActions }; // add payment: paymentActions

const setBpmnDetailsMock = jest.fn();
jest.mock('../../../../contexts/BpmnContext', () => ({
  useBpmnContext: jest.fn(() => ({
    modelerRef: mockModelerRef,
    setBpmnDetails: setBpmnDetailsMock,
    bpmnDetails: mockBpmnDetails,
  })),
}));

jest.mock('bpmn-js/lib/features/modeling/BpmnFactory', () => ({
  BpmnFactory: jest.fn(() => ({
    create: jest.fn(),
  })),
}));

const overrideBpmnDetailsMock = (bpmnDetailsToOverride: BpmnDetails) => {
  (useBpmnContext as jest.Mock).mockReturnValue({
    modelerRef: mockModelerRef,
    setBpmnDetails: setBpmnDetailsMock,
    bpmnDetails: bpmnDetailsToOverride,
  });
};

describe('EditActions', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render only "add new action" button when task have no actions', () => {
    renderEditActions({
      ...mockBpmnDetails,
      element: { businessObject: { extensionElements: { values: [{}] } } },
    });
    const addNewActionButton = screen.getAllByRole('button', {
      name: textMock('process_editor.configuration_panel_actions_add_new'),
    });
    expect(addNewActionButton).toHaveLength(1);
  });

  it('should render existing actions when task have predefined actions', () => {
    const predefinedAction =
      mockBpmnDetails.element.businessObject.extensionElements.values[0].actions.action[0].action;
    const customServerAction =
      mockBpmnDetails.element.businessObject.extensionElements.values[0].actions.action[1].action;
    const customProcessAction =
      mockBpmnDetails.element.businessObject.extensionElements.values[0].actions.action[2].action;
    renderEditActions();
    screen.getByDisplayValue(predefinedAction);
    screen.getByDisplayValue(customServerAction);
    screen.getByDisplayValue(customProcessAction);
    const serverActionCheckboxForPredefinedAction = screen.queryByRole('checkbox', {
      name: `set_server_type_for_${predefinedAction}_action`,
    });
    expect(serverActionCheckboxForPredefinedAction).not.toBeInTheDocument();
    screen.getByRole('checkbox', { name: `set_server_type_for_${customServerAction}_action` });
    screen.getByRole('checkbox', { name: `set_server_type_for_${customProcessAction}_action` });
  });

  it('should render help text for custom actions', async () => {
    const user = userEvent.setup();
    renderEditActions();
    const helpTextButton = screen.getAllByRole('button', {
      name: textMock('process_editor.configuration_panel_actions_action_type_help_text'),
    });
    expect(helpTextButton).toHaveLength(2);
    await user.click(helpTextButton[0]);
    screen.getByText(textMock('process_editor.configuration_panel_actions_set_server_action_info'));
  });

  it('should render checkbox that is checked for a task that has en existing custom serverAction', () => {
    const serverAction =
      mockBpmnDetails.element.businessObject.extensionElements.values[0].actions.action[1].action;
    renderEditActions();
    const serverActionCheckBox = screen.getByRole('checkbox', {
      name: `set_server_type_for_${serverAction}_action`,
    });
    expect(serverActionCheckBox).toBeInTheDocument();
    expect(serverActionCheckBox).toBeChecked();
  });

  it('should render checkbox that is not checked for a task that has an existing custom processAction', () => {
    const processAction =
      mockBpmnDetails.element.businessObject.extensionElements.values[0].actions.action[2].action;
    renderEditActions();
    const processActionCheckBox = screen.getByRole('checkbox', {
      name: `set_server_type_for_${processAction}_action`,
    });
    expect(processActionCheckBox).toBeInTheDocument();
    expect(processActionCheckBox).not.toBeChecked();
  });

  it.each(['confirmation', 'signing'])(
    // add payment
    'should render readOnly combobox for actions that are required for task type: %s',
    (taskType: BpmnTaskType) => {
      const actions = actionsForTaskTypes[taskType];
      const element = { businessObject: { extensionElements: { values: [actions] } } };
      renderEditActions({ ...mockBpmnDetails, taskType: taskType, element });
      actions.actions.action.forEach((action) => {
        const combobox = screen.getByTitle(`combobox_${action.action}`);
        expect(combobox).toHaveAttribute('readOnly');
      });
    },
  );

  it('should call "create" and "updateModdleProperties" when clicking "add new action"', async () => {
    const user = userEvent.setup();
    renderEditActions({
      ...mockBpmnDetails,
      element: { businessObject: { extensionElements: { values: [{}] } } },
    });
    const addNewActionButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_actions_add_new'),
    });
    await user.click(addNewActionButton);
    expect(createMock).toHaveBeenCalledTimes(2);
    expect(updateModdlePropertiesMock).toHaveBeenCalledTimes(1);
  });

  it('should show combobox with all predefined actions as options when task is "data"', async () => {
    const user = userEvent.setup();
    const availableDataActions = ['write', 'reject', 'confirm'];
    const actionName =
      mockBpmnDetails.element.businessObject.extensionElements.values[0].actions.action[0].action;
    renderEditActions();
    const combobox = screen.getByTitle(`combobox_${actionName}`);
    await user.click(combobox);
    availableDataActions.forEach((action) => screen.getByRole('option', { name: action }));
  });

  it('should call updateModdleProperties on modeling with actionType=server when setting serverAction', async () => {
    const user = userEvent.setup();
    renderEditActions();
    const processAction =
      mockBpmnDetails.element.businessObject.extensionElements.values[0].actions.action[2];
    expect(processAction.type).toBe(ActionType.Process);
    const checkBox = screen.getByRole('checkbox', {
      name: `set_server_type_for_${processAction.action}_action`,
    });
    await user.click(checkBox);
    expect(updateModdlePropertiesMock).toHaveBeenCalledTimes(1);
    expect(updateModdlePropertiesMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        actions: expect.objectContaining({
          action: expect.arrayContaining([{ ...processAction, type: ActionType.Server }]),
        }),
      }),
    );
  });

  it('should call updateModdleProperties on modeling with actionType=process when unsetting serverAction', async () => {
    const user = userEvent.setup();
    renderEditActions();
    const serverAction =
      mockBpmnDetails.element.businessObject.extensionElements.values[0].actions.action[1];
    expect(serverAction.type).toBe(ActionType.Server);
    const checkBox = screen.getByRole('checkbox', {
      name: `set_server_type_for_${serverAction.action}_action`,
    });
    await user.click(checkBox);
    expect(updateModdlePropertiesMock).toHaveBeenCalledTimes(1);
    expect(updateModdlePropertiesMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        actions: expect.objectContaining({
          action: expect.arrayContaining([{ ...serverAction, type: ActionType.Process }]),
        }),
      }),
    );
  });

  it('should call updateModdleProperties on modeling with new action name when typing a new action in combobox', async () => {
    const user = userEvent.setup();
    const actionWrite =
      mockBpmnDetails.element.businessObject.extensionElements.values[0].actions.action[0];
    const newActionNameCustom = 'myCustomAction';
    renderEditActions();
    const combobox = screen.getByTitle(`combobox_${actionWrite.action}`);
    await user.clear(combobox);
    await user.type(combobox, newActionNameCustom);
    await user.tab();
    expect(updateModdlePropertiesMock).toHaveBeenCalledTimes(1);
    expect(updateModdlePropertiesMock).toHaveBeenCalledWith(mockBpmnDetails.element, actionWrite, {
      action: newActionNameCustom,
    });
  });

  it('should call updateModdleProperties on modeling with new action name and deleted action type when changing a custom action to a predefined', async () => {
    const user = userEvent.setup();
    renderEditActions();
    const serverAction =
      mockBpmnDetails.element.businessObject.extensionElements.values[0].actions.action[1];
    const newActionNameReject = 'reject';
    expect(serverAction.type).toBe(ActionType.Server);
    const combobox = screen.getByTitle(`combobox_${serverAction.action}`);
    await user.clear(combobox);
    const actionOption = screen.getByRole('option', { name: newActionNameReject });
    await user.click(actionOption);
    expect(updateModdlePropertiesMock).toHaveBeenCalledTimes(1);
    expect(updateModdlePropertiesMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: serverAction.action }) &&
        expect.not.objectContaining({ type: serverAction.type }),
      { action: newActionNameReject },
    );
  });

  it('should call updateModdleProperties on modeling without specific action when deleting an action', async () => {
    const user = userEvent.setup();
    renderEditActions();
    const writeAction =
      mockBpmnDetails.element.businessObject.extensionElements.values[0].actions.action[0];
    const serverAction =
      mockBpmnDetails.element.businessObject.extensionElements.values[0].actions.action[1];
    const processAction =
      mockBpmnDetails.element.businessObject.extensionElements.values[0].actions.action[2];
    const deleteButton = screen.getByTitle(
      textMock('general.delete').concat(' ', serverAction.action),
    );
    await user.click(deleteButton);
    expect(updateModdlePropertiesMock).toHaveBeenCalledTimes(1);
    expect(updateModdlePropertiesMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        actions:
          expect.objectContaining({ writeAction }) &&
          expect.objectContaining({ processAction }) &&
          expect.not.objectContaining({ serverAction }),
      }),
    );
  });

  it('should call updateModdleProperties on modeling without any actions when deleting the only existing one', async () => {
    const user = userEvent.setup();
    const writeAction = { action: 'write' };
    renderEditActions({
      ...mockBpmnDetails,
      element: {
        businessObject: { extensionElements: { values: [{ actions: { action: [writeAction] } }] } },
      },
    });
    const deleteButton = screen.getByTitle(
      textMock('general.delete').concat(' ', writeAction.action),
    );
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
    const writeAction =
      mockBpmnDetails.element.businessObject.extensionElements.values[0].actions.action[0];
    const newActionNameWrite = 'write';
    renderEditActions();
    const combobox = screen.getByTitle(`combobox_${writeAction.action}`);
    await user.clear(combobox);
    const actionOption = screen.getByRole('option', { name: newActionNameWrite });
    await user.click(actionOption);
    expect(updateModdlePropertiesMock).toHaveBeenCalledTimes(0);
  });
});

const renderEditActions = (bpmnDetails = mockBpmnDetails) => {
  const bpmnDetailsCopy = ObjectUtils.deepCopy(bpmnDetails);
  overrideBpmnDetailsMock(bpmnDetailsCopy);
  return render(<EditActions />);
};
