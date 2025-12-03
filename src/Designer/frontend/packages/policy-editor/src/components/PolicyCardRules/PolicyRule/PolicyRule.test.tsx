import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PolicyRule, type PolicyRuleProps } from './PolicyRule';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { mockActionId3 } from '../../../../test/mocks/policyActionMocks';
import { mockPolicyRuleCard1 } from '../../../../test/mocks/policyRuleMocks';
import { mockSubject2, mockSubjectTitle2 } from '../../../../test/mocks/policySubjectMocks';
import {
  PolicyEditorContext,
  type PolicyEditorContextProps,
} from '../../../contexts/PolicyEditorContext';
import { mockPolicyEditorContextValue } from '../../../../test/mocks/policyEditorContextMock';

const defaultProps: PolicyRuleProps = {
  policyRule: mockPolicyRuleCard1,
  showErrors: false,
  ruleIndex: 0,
};

describe('PolicyRule', () => {
  afterEach(jest.clearAllMocks);

  it('calls "setPolicyRules" and "savePolicy" when the clone button is clicked', async () => {
    const user = userEvent.setup();
    renderPolicyRule();

    const [moreButton] = screen.getAllByRole('button', { name: textMock('policy_editor.more') });
    await user.click(moreButton);

    const [cloneButton] = screen.getAllByRole('menuitem', {
      name: textMock('policy_editor.expandable_card_dropdown_copy'),
    });
    await user.click(cloneButton);

    expect(mockPolicyEditorContextValue.setPolicyRules).toHaveBeenCalledTimes(1);
    expect(mockPolicyEditorContextValue.savePolicy).toHaveBeenCalledTimes(1);
  });

  it('calls "setPolicyRules" and "savePolicy" when the delete button is clicked', async () => {
    const user = userEvent.setup();
    renderPolicyRule();
    jest.spyOn(window, 'confirm').mockImplementation(() => true);

    const [moreButton] = screen.getAllByRole('button', { name: textMock('policy_editor.more') });
    await user.click(moreButton);

    const [deleteButton] = screen.getAllByRole('menuitem', { name: textMock('general.delete') });
    await user.click(deleteButton);

    expect(mockPolicyEditorContextValue.setPolicyRules).toHaveBeenCalledTimes(1);
    expect(mockPolicyEditorContextValue.savePolicy).toHaveBeenCalledTimes(1);
  });

  it('calls "savePolicy" when input fields are blurred', async () => {
    const user = userEvent.setup();
    const mockSavePolicy = jest.fn();
    renderPolicyRule({ usageType: 'resource', savePolicy: mockSavePolicy });

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
    const actionOption: string = textMock(`policy_editor.action_${mockActionId3}`);
    await user.selectOptions(actionSelect, screen.getByRole('option', { name: actionOption }));
    await user.tab();

    const altinnRoleTab = screen.getByText(
      textMock('policy_editor.rule_card_subjects_altinn_roles'),
    );
    await user.click(altinnRoleTab);

    const subjectCheckbox = screen.getByLabelText(
      `${mockSubjectTitle2} (${mockSubject2.legacyRoleCode})`,
    );
    await user.click(subjectCheckbox);

    const [descriptionField] = screen.getAllByLabelText(
      textMock('policy_editor.rule_card_description_title'),
    );
    expect(descriptionField).toHaveValue(mockPolicyRuleCard1.description);
    await user.type(descriptionField, newWord);
    await user.tab();

    const numFields = 5;
    expect(mockSavePolicy).toHaveBeenCalledTimes(numFields + 1);
  });

  it('renders policy rule with description when usage type is app', () => {
    const mockRuleDescription = 'test description';
    renderPolicyRule(
      { usageType: 'app' },
      { policyRule: { ...mockPolicyRuleCard1, description: mockRuleDescription } },
    );
    expect(screen.getByText(mockRuleDescription)).toBeInTheDocument();
  });
});

const renderPolicyRule = (
  policyEditorContextProps: Partial<PolicyEditorContextProps> = {},
  props: Partial<PolicyRuleProps> = {},
) => {
  return render(
    <PolicyEditorContext.Provider
      value={{ ...mockPolicyEditorContextValue, ...policyEditorContextProps }}
    >
      <PolicyRule {...defaultProps} {...props} />
    </PolicyEditorContext.Provider>,
  );
};
