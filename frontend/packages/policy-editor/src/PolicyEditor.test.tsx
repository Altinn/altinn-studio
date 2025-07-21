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

  it('renders tabs view when usage type is app', () => {
    renderPolicyEditor();
    expect(screen.getByText(textMock('policy_editor.rules_summary'))).toBeInTheDocument();
    expect(screen.getByText(textMock('policy_editor.rules_edit'))).toBeInTheDocument();
    expect(screen.getByText(textMock('policy_editor.summary_heading'))).toBeInTheDocument();
  });

  it('renders rules view when usage type is resource', () => {
    renderPolicyEditor({ usageType: 'resource' });
    expect(screen.queryByText(textMock('policy_editor.rules_summary'))).not.toBeInTheDocument();
    expect(screen.getByText(textMock('policy_editor.card_button_text'))).toBeInTheDocument();
  });

  it('renders consent rules view when resource is consent resource', () => {
    renderPolicyEditor({ usageType: 'resource', isConsentResource: true });
    expect(
      screen.getByText(textMock('policy_editor.consent_resource_consent_header')),
    ).toBeInTheDocument();
  });

  it('changes the auth level when the user selects a different auth level', async () => {
    const user = userEvent.setup();
    renderPolicyEditor();

    const [selectElement] = screen.getAllByLabelText(
      textMock('policy_editor.select_auth_level_label'),
    );
    expect(selectElement).toHaveValue(mockRequiredAuthLevel);

    await user.selectOptions(
      selectElement,
      screen.getByRole('option', { name: textMock(authlevelOptions[3].label) }),
    );

    expect(
      screen.getByRole<HTMLOptionElement>('option', { name: textMock(authlevelOptions[3].label) })
        .selected,
    ).toBe(true);
  });

  it('calls "onSave" when the auth level changes', async () => {
    const user = userEvent.setup();
    renderPolicyEditor();

    const [selectElement] = screen.getAllByLabelText(
      textMock('policy_editor.select_auth_level_label'),
    );
    await user.click(selectElement);

    const mockOption2 = textMock(authlevelOptions[2].label);
    await user.selectOptions(selectElement, screen.getByRole('option', { name: mockOption2 }));
    await user.tab();

    expect(mockOnSave).toHaveBeenCalledTimes(1);
  });

  it('increases the rule list length when add rule button is clicked', async () => {
    const user = userEvent.setup();
    renderPolicyEditor();

    const rulesTab = screen.getByRole('tab', { name: textMock('policy_editor.rules_edit') });
    await user.click(rulesTab);

    const originalLength = mockPolicy.rules.length;

    const addButton = screen.getByRole('button', {
      name: textMock('policy_editor.card_button_text'),
    });

    await user.click(addButton);

    const ruleContextMenuButtons = screen.getAllByRole('button', {
      name: textMock('policy_editor.more'),
    });

    expect(ruleContextMenuButtons.length).toEqual(originalLength + 1);
  });
});

const renderPolicyEditor = (policyEditorProps: Partial<PolicyEditorProps> = {}) => {
  return render(<PolicyEditor {...defaultProps} {...policyEditorProps} />);
};
