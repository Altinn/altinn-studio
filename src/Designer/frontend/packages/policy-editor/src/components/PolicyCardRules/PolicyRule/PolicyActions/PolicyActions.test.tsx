import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PolicyActions } from './PolicyActions';
import { textMock } from '@studio/testing/mocks/i18nMock';
import {
  mockAction1,
  mockAction2,
  mockAction3,
  mockAction4,
} from '../../../../../test/mocks/policyActionMocks';
import { PolicyEditorContext } from '../../../../contexts/PolicyEditorContext';
import { PolicyRuleContext } from '../../../../contexts/PolicyRuleContext';
import { mockPolicyEditorContextValue } from '../../../../../test/mocks/policyEditorContextMock';
import { mockPolicyRuleContextValue } from '../../../../../test/mocks/policyRuleContextMock';

const mockActionOption1: string = mockAction1.actionTitle;
const mockActionOption2: string = mockAction2.actionTitle;
const mockActionOption3: string = mockAction3.actionTitle;
const mockActionOption4: string = mockAction4.actionTitle;

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

    const inputAllSelected = screen.getByText(
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
    expect(selectedSubject).not.toBeInTheDocument();

    await user.click(actionSelect);
    expect(screen.getByRole('option', { name: mockActionOption1 })).toBeInTheDocument();
  });

  it('calls the "savePolicy", and "setPolicyError" function when the chip is clicked', async () => {
    const user = userEvent.setup();
    renderPolicyActions();

    const chipElement = screen.getByText(mockActionOption2);
    await user.click(chipElement);

    expect(mockPolicyEditorContextValue.savePolicy).toHaveBeenCalledTimes(1);
    expect(mockPolicyRuleContextValue.setPolicyError).toHaveBeenCalledTimes(1);
  });

  it('should show actions error', () => {
    renderPolicyActions();

    const error = screen.getByText(textMock('policy_editor.rule_card_actions_error'));
    expect(error).toBeInTheDocument();
  });
});

const renderPolicyActions = () => {
  return render(<ContextWrapper />);
};

const ContextWrapper = () => {
  // Add local state for policyRule
  const [policyRules, setPolicyRules] = useState([
    {
      ...mockPolicyRuleContextValue.policyRule,
      actions: [mockAction1.actionId, mockAction2.actionId, mockAction4.actionId],
    },
  ]);

  return (
    <PolicyEditorContext.Provider
      value={{
        ...mockPolicyEditorContextValue,
        actions: [mockAction1, mockAction2, mockAction3, mockAction4],
        policyRules: policyRules,
        setPolicyRules,
      }}
    >
      <PolicyRuleContext.Provider
        value={{
          ...mockPolicyRuleContextValue,
          policyError: {
            resourceError: false,
            actionsError: true,
            subjectsError: false,
          },
          showAllErrors: true,
          policyRule: { ...policyRules[0] },
        }}
      >
        <PolicyActions />
      </PolicyRuleContext.Provider>
    </PolicyEditorContext.Provider>
  );
};
