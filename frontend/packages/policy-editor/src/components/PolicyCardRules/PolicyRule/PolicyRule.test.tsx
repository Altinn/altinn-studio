import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PolicyRule, type PolicyRuleProps } from './PolicyRule';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { mockActionId3 } from '../../../../test/mocks/policyActionMocks';
import { mockPolicyRuleCard1 } from '../../../../test/mocks/policyRuleMocks';
import { mockSubjectTitle2 } from '../../../../test/mocks/policySubjectMocks';
import {
  PolicyEditorContext,
  type PolicyEditorContextProps,
} from '../../../contexts/PolicyEditorContext';
import { mockPolicyEditorContextValue } from '../../../../test/mocks/policyEditorContextMock';

const mockHandleCloneRule = jest.fn();
const mockHandleDeleteRule = jest.fn();

const defaultProps: PolicyRuleProps = {
  policyRule: mockPolicyRuleCard1,
  handleCloneRule: mockHandleCloneRule,
  handleDeleteRule: mockHandleDeleteRule,
  showErrors: false,
};

describe('PolicyRule', () => {
  afterEach(jest.clearAllMocks);

  it('calls "handleCloneRule" when the clone button is clicked', async () => {
    const user = userEvent.setup();
    renderPolicyRule();

    const [moreButton] = screen.getAllByRole('button', { name: textMock('policy_editor.more') });
    await user.click(moreButton);

    const [cloneButton] = screen.getAllByRole('menuitem', {
      name: textMock('policy_editor.expandable_card_dropdown_copy'),
    });
    await user.click(cloneButton);

    expect(mockHandleCloneRule).toHaveBeenCalledTimes(1);
  });

  it('calls "handleDeleteRule" when the delete button is clicked', async () => {
    const user = userEvent.setup();
    renderPolicyRule();

    const [moreButton] = screen.getAllByRole('button', { name: textMock('policy_editor.more') });
    await user.click(moreButton);

    const [deleteButton] = screen.getAllByRole('menuitem', { name: textMock('general.delete') });
    await user.click(deleteButton);

    expect(mockHandleDeleteRule).toHaveBeenCalledTimes(1);
  });

  it('calls "setPolicyRules" when description field is edited', async () => {
    const user = userEvent.setup();
    renderPolicyRule();

    const [descriptionField] = screen.getAllByLabelText(
      textMock('policy_editor.rule_card_description_title'),
    );
    expect(descriptionField).toHaveValue(mockPolicyRuleCard1.description);
    await user.type(descriptionField, '1');

    expect(mockPolicyEditorContextValue.setPolicyRules).toHaveBeenCalledTimes(1);
  });

  it('calls "savePolicy" when input fields are blurred', async () => {
    const user = userEvent.setup();
    renderPolicyRule();

    const [typeInput] = screen.getAllByLabelText(
      textMock('policy_editor.narrowing_list_field_type'),
    );
    const [idInput] = screen.getAllByLabelText(textMock('policy_editor.narrowing_list_field_id'));

    const newWord: string = 'test';
    await user.type(typeInput, newWord);
    await user.tab();
    await user.type(idInput, newWord);
    await user.tab();

    const [actionSelect] = screen.getAllByLabelText(
      textMock('policy_editor.rule_card_actions_title'),
    );
    await user.click(actionSelect);

    const actionOption: string = textMock(`policy_editor.action_${mockActionId3}`);
    await user.click(screen.getByRole('option', { name: actionOption }));
    await user.tab();

    const [subjectSelect] = screen.getAllByLabelText(
      textMock('policy_editor.rule_card_subjects_title'),
    );
    await user.click(subjectSelect);
    await user.click(screen.getByRole('option', { name: mockSubjectTitle2 }));
    await user.tab();

    const [descriptionField] = screen.getAllByLabelText(
      textMock('policy_editor.rule_card_description_title'),
    );
    expect(descriptionField).toHaveValue(mockPolicyRuleCard1.description);
    await user.type(descriptionField, newWord);
    await user.tab();

    const numFields = 5;
    expect(mockPolicyEditorContextValue.savePolicy).toHaveBeenCalledTimes(numFields);
  });
});

const renderPolicyRule = (policyEditorContextProps: Partial<PolicyEditorContextProps> = {}) => {
  return render(
    <PolicyEditorContext.Provider
      value={{ ...mockPolicyEditorContextValue, ...policyEditorContextProps }}
    >
      <PolicyRule {...defaultProps} />
    </PolicyEditorContext.Provider>,
  );
};
