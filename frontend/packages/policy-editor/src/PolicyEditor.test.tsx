import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PolicyEditor, type PolicyEditorProps } from './PolicyEditor';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { Policy, RequiredAuthLevel, PolicyEditorUsage } from './types';
import { authlevelOptions } from './components/SecurityLevelSelect/SecurityLevelSelect';
import { mockActions } from '../test/mocks/policyActionMocks';
import { mockSubjects } from '../test/mocks/policySubjectMocks';
import { mockPolicyRules } from '../test/mocks/policyRuleMocks';
import { mockResourecId1 } from '../test/mocks/policySubResourceMocks';

const mockRequiredAuthLevel: RequiredAuthLevel = '3';
const mockRequiredAuthLevelLabel: string = textMock(authlevelOptions[3].label);

const mockPolicy: Policy = {
  rules: mockPolicyRules,
  requiredAuthenticationLevelEndUser: mockRequiredAuthLevel,
  requiredAuthenticationLevelOrg: '3',
};

const mockUsageType: PolicyEditorUsage = 'app';

const mockOnSave = jest.fn();

const defaultProps: PolicyEditorProps = {
  policy: mockPolicy,
  actions: mockActions,
  subjects: mockSubjects,
  resourceId: mockResourecId1,
  onSave: mockOnSave,
  showAllErrors: false,
  usageType: mockUsageType,
};

describe('PolicyEditor', () => {
  afterEach(jest.clearAllMocks);

  it('changes the auth level when the user selects a different auth level', async () => {
    const user = userEvent.setup();
    renderPolicyEditor();

    const [selectElement] = screen.getAllByLabelText(
      textMock('policy_editor.select_auth_level_label'),
    );
    expect(selectElement).toHaveValue(mockRequiredAuthLevelLabel);

    await user.click(selectElement);

    const mockOption2 = textMock(authlevelOptions[2].label);
    await user.click(screen.getByRole('option', { name: mockOption2 }));

    const [selectElementAfter] = screen.getAllByLabelText(
      textMock('policy_editor.select_auth_level_label'),
    );
    expect(selectElementAfter).toHaveValue(mockOption2);
  });

  it('calls "onSave" when the auth level changes', async () => {
    const user = userEvent.setup();
    renderPolicyEditor();

    const [selectElement] = screen.getAllByLabelText(
      textMock('policy_editor.select_auth_level_label'),
    );
    await user.click(selectElement);

    const mockOption2 = textMock(authlevelOptions[2].label);
    await user.click(screen.getByRole('option', { name: mockOption2 }));
    await user.tab();

    expect(mockOnSave).toHaveBeenCalledTimes(1);
  });

  it('increases the rule list length when add rule button is clicked', async () => {
    const user = userEvent.setup();
    renderPolicyEditor();

    const originalLength = mockPolicy.rules.length;

    const addButton = screen.getByRole('button', {
      name: textMock('policy_editor.card_button_text'),
    });

    await user.click(addButton);

    const aLabelFromPolicyCard = screen.queryAllByText(
      textMock('policy_editor.rule_card_sub_resource_title'),
    );

    expect(aLabelFromPolicyCard.length).toEqual(originalLength + 1);
  });
});

const renderPolicyEditor = (policyEditorProps: Partial<PolicyEditorProps> = {}) => {
  return render(<PolicyEditor {...defaultProps} {...policyEditorProps} />);
};
