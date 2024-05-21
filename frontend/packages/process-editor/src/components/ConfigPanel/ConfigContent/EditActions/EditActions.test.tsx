import React from 'react';
import { render, screen } from '@testing-library/react';
import { EditActions } from './EditActions';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import {
  confirmationActions,
  mockBpmnDetails,
  paymentActions,
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

const actionsForTaskTypes = {
  confirmation: confirmationActions,
  signing: signingActions,
  payment: paymentActions,
}; // add payment: paymentActions

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
    expect(
      screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_actions_action_label', {
          actionIndex: 1,
          actionName: predefinedAction,
        }),
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_actions_action_label', {
          actionIndex: 2,
          actionName: customServerAction,
        }),
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_actions_action_label', {
          actionIndex: 3,
          actionName: customProcessAction,
        }),
      }),
    ).toBeInTheDocument();
  });

  it.each(['confirmation', 'signing', 'payment'])(
    'should render readOnly non-clickable defined action button for actions that are required for task type: %s',
    (taskType: BpmnTaskType) => {
      const actions = actionsForTaskTypes[taskType];
      const element = { businessObject: { extensionElements: { values: [actions] } } };
      renderEditActions({ ...mockBpmnDetails, taskType: taskType, element });
      actions.actions.action.forEach((action, index) => {
        const definedActionButton = screen.getByRole('button', {
          name: textMock('process_editor.configuration_panel_actions_action_label', {
            actionIndex: index + 1,
            actionName: action.action,
          }),
        });
        expect(definedActionButton).toHaveAttribute('aria-readonly');
      });
    },
  );

  it('should not render optional action for task as read only', () => {
    const predefinedAction =
      mockBpmnDetails.element.businessObject.extensionElements.values[0].actions.action[0].action;
    renderEditActions();
    const definedActionButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_actions_action_label', {
        actionIndex: 1,
        actionName: predefinedAction,
      }),
    });
    expect(definedActionButton).not.toHaveAttribute('aria-readonly');
  });

  it('should call "create" and "updateModdleProperties" when clicking "add new action"', async () => {
    const user = userEvent.setup();
    renderEditActions();
    const addNewActionButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_actions_add_new'),
    });
    await user.click(addNewActionButton);
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(updateModdlePropertiesMock).toHaveBeenCalledTimes(1);
  });
});

const renderEditActions = (bpmnDetails = mockBpmnDetails) => {
  const bpmnDetailsCopy = ObjectUtils.deepCopy(bpmnDetails);
  overrideBpmnDetailsMock(bpmnDetailsCopy);
  return render(<EditActions />);
};
