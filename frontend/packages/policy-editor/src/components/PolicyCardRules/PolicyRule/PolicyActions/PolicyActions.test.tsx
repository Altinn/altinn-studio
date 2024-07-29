import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PolicyActions } from './PolicyActions';
import { textMock } from '@studio/testing/mocks/i18nMock';
import {
  mockActionId1,
  mockActionId2,
  mockActionId3,
  mockActionId4,
} from '../../../../../test/mocks/policyActionMocks';
import { PolicyEditorContext } from '../../../../contexts/PolicyEditorContext';
import { PolicyRuleContext } from '../../../../contexts/PolicyRuleContext';
import { mockPolicyEditorContextValue } from '../../../../../test/mocks/policyEditorContextMock';
import { mockPolicyRuleContextValue } from '../../../../../test/mocks/policyRuleContextMock';

const mockActionOption1: string = textMock(`policy_editor.action_${mockActionId1}`);
const mockActionOption2: string = textMock(`policy_editor.action_${mockActionId2}`);
const mockActionOption3: string = textMock(`policy_editor.action_${mockActionId3}`);
const mockActionOption4: string = mockActionId4;

describe('PolicyActions', () => {
  afterEach(jest.clearAllMocks);

  it('displays the selected actions as Chips', async () => {
    const user = userEvent.setup();
    renderPolicyActions();

    const selectedAction1 = screen.getByLabelText(
      `${textMock('general.delete')} ${mockActionOption1}`,
    );
    const selectedAction2 = screen.getByLabelText(
      `${textMock('general.delete')} ${mockActionOption2}`,
    );
    const selectedAction3 = screen.queryByLabelText(
      `${textMock('general.delete')} ${mockActionOption3}`,
    );
    const selectedAction4 = screen.getByLabelText(
      `${textMock('general.delete')} ${mockActionOption4}`,
    );
    expect(selectedAction1).toBeInTheDocument();
    expect(selectedAction2).toBeInTheDocument();
    expect(selectedAction3).not.toBeInTheDocument();
    expect(selectedAction4).toBeInTheDocument();

    const [actionSelect] = screen.getAllByLabelText(
      textMock('policy_editor.rule_card_actions_title'),
    );
    await user.click(actionSelect);

    const optionAction1 = screen.queryByRole('option', { name: mockActionOption1 });
    const optionAction2 = screen.queryByRole('option', { name: mockActionOption2 });
    const optionAction3 = screen.getByRole('option', { name: mockActionOption3 });
    const optionAction4 = screen.queryByRole('option', { name: mockActionOption4 });

    expect(optionAction1).not.toBeInTheDocument();
    expect(optionAction2).not.toBeInTheDocument();
    expect(optionAction3).toBeInTheDocument();
    expect(optionAction4).not.toBeInTheDocument();

    await user.selectOptions(actionSelect, mockActionOption3);

    expect(mockPolicyEditorContextValue.setPolicyRules).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByLabelText(`${textMock('general.delete')} ${mockActionOption3}`),
    ).not.toBeInTheDocument();

    const [inputAllSelected] = screen.getAllByText(
      textMock('policy_editor.rule_card_actions_select_all_selected'),
    );
    expect(inputAllSelected).toBeInTheDocument();
  });

  it('should append action to selectable actions options list when selected action is removed', async () => {
    const user = userEvent.setup();
    renderPolicyActions();

    const [actionSelect] = screen.getAllByLabelText(
      textMock('policy_editor.rule_card_actions_title'),
    );
    await user.click(actionSelect);

    expect(screen.queryByRole('option', { name: mockActionOption1 })).toBeNull();

    const selectedSubject = screen.getByLabelText(
      `${textMock('general.delete')} ${mockActionOption1}`,
    );
    await user.click(selectedSubject);

    await user.click(actionSelect);
    expect(screen.getByRole('option', { name: mockActionOption1 })).toBeInTheDocument();
  });

  it('calls the "setPolicyRules", "savePolicy", and "setPolicyError" function when the chip is clicked', async () => {
    const user = userEvent.setup();
    renderPolicyActions();

    const chipElement = screen.getByText(textMock('policy_editor.action_write'));
    await user.click(chipElement);

    expect(mockPolicyEditorContextValue.setPolicyRules).toHaveBeenCalledTimes(1);
    expect(mockPolicyEditorContextValue.savePolicy).toHaveBeenCalledTimes(1);
    expect(mockPolicyRuleContextValue.setPolicyError).toHaveBeenCalledTimes(1);
  });
});

const renderPolicyActions = () => {
  return render(
    <PolicyEditorContext.Provider value={mockPolicyEditorContextValue}>
      <PolicyRuleContext.Provider value={mockPolicyRuleContextValue}>
        <PolicyActions />
      </PolicyRuleContext.Provider>
    </PolicyEditorContext.Provider>,
  );
};
