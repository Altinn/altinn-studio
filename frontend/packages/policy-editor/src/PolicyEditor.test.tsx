import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PolicyEditorProps } from './PolicyEditor';
import { PolicyEditor } from './PolicyEditor';
import { act } from 'react-dom/test-utils';
import { textMock } from '../../../testing/mocks/i18nMock';
import type { Policy, RequiredAuthLevel, PolicyEditorUsage } from './types';
import { mockActions, mockPolicyRules, mockResourecId1, mockSubjects } from './data-mocks';
import { authlevelOptions } from './components/SecurityLevelSelect/SecurityLevelSelect';

const mockRequiredAuthLevel: RequiredAuthLevel = '3';
const mockRequiredAuthLevelLabel: string = textMock(authlevelOptions[3].label);

const mockPolicy: Policy = {
  rules: mockPolicyRules,
  requiredAuthenticationLevelEndUser: mockRequiredAuthLevel,
  requiredAuthenticationLevelOrg: '3',
};

const mockUsageType: PolicyEditorUsage = 'app';

describe('PolicyEditor', () => {
  afterEach(jest.clearAllMocks);

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

  it('displays the alert title for app when usagetype is app', async () => {
    const user = userEvent.setup();
    render(<PolicyEditor {...defaultProps} />);

    const alertTextApp = screen.getByText(
      textMock('policy_editor.alert', { usageType: textMock('policy_editor.alert_app') }),
    );
    const alertTextResource = screen.queryByText(
      textMock('policy_editor.alert', { usageType: textMock('policy_editor.alert_resource') }),
    );

    // Fix to remove act error
    await act(() => user.tab());

    expect(alertTextApp).toBeInTheDocument();
    expect(alertTextResource).not.toBeInTheDocument();
  });

  it('displays the alert title for resource when usagetype is not app', async () => {
    const user = userEvent.setup();
    render(<PolicyEditor {...defaultProps} usageType='resource' />);

    const alertTextApp = screen.queryByText(
      textMock('policy_editor.alert', { usageType: textMock('policy_editor.alert_app') }),
    );
    const alertTextResource = screen.getByText(
      textMock('policy_editor.alert', { usageType: textMock('policy_editor.alert_resource') }),
    );

    // Fix to remove act error
    await act(() => user.tab());

    expect(alertTextApp).not.toBeInTheDocument();
    expect(alertTextResource).toBeInTheDocument();
  });

  it('changes the auth level when the user selects a different auth level', async () => {
    const user = userEvent.setup();
    render(<PolicyEditor {...defaultProps} />);

    const [selectElement] = screen.getAllByLabelText(
      textMock('policy_editor.select_auth_level_label'),
    );
    expect(selectElement).toHaveValue(mockRequiredAuthLevelLabel);

    await act(() => user.click(selectElement));

    const mockOption2 = textMock(authlevelOptions[2].label);
    await act(() => user.click(screen.getByRole('option', { name: mockOption2 })));

    const [selectElementAfter] = screen.getAllByLabelText(
      textMock('policy_editor.select_auth_level_label'),
    );
    expect(selectElementAfter).toHaveValue(mockOption2);
  });

  it('calls "onSave" when the auth level changes', async () => {
    const user = userEvent.setup();
    render(<PolicyEditor {...defaultProps} />);

    const [selectElement] = screen.getAllByLabelText(
      textMock('policy_editor.select_auth_level_label'),
    );
    await act(() => user.click(selectElement));

    const mockOption2 = textMock(authlevelOptions[2].label);
    await act(() => user.click(screen.getByRole('option', { name: mockOption2 })));
    await act(() => user.tab());

    expect(mockOnSave).toHaveBeenCalledTimes(1);
  });

  it('displays the rules when there are more than 0 rules', async () => {
    const user = userEvent.setup();
    render(<PolicyEditor {...defaultProps} />);

    const aLabelFromPolicyCard = screen.getAllByText(
      textMock('policy_editor.rule_card_sub_resource_title'),
    );

    // Fix to remove act error
    await act(() => user.tab());

    expect(aLabelFromPolicyCard.length).toEqual(mockPolicy.rules.length);
  });

  it('displays no rules when the policy has no rules', async () => {
    const user = userEvent.setup();
    render(<PolicyEditor {...defaultProps} policy={{ ...mockPolicy, rules: [] }} />);

    const aLabelFromPolicyCard = screen.queryAllByText(
      textMock('policy_editor.rule_card_sub_resource_title'),
    );

    // Fix to remove act error
    await act(() => user.tab());

    expect(aLabelFromPolicyCard.length).toEqual(0);
  });

  it('increases the rule list length when add rule button is clicked', async () => {
    const user = userEvent.setup();
    render(<PolicyEditor {...defaultProps} />);

    const originalLength = mockPolicy.rules.length;

    const addButton = screen.getByRole('button', {
      name: textMock('policy_editor.card_button_text'),
    });

    await act(() => user.click(addButton));

    const aLabelFromPolicyCard = screen.queryAllByText(
      textMock('policy_editor.rule_card_sub_resource_title'),
    );

    expect(aLabelFromPolicyCard.length).toEqual(originalLength + 1);
  });

  it('calls "onSave" when a new rule is added', async () => {
    const user = userEvent.setup();
    render(<PolicyEditor {...defaultProps} />);

    const addButton = screen.getByRole('button', {
      name: textMock('policy_editor.card_button_text'),
    });

    await act(() => user.click(addButton));

    expect(mockOnSave).toHaveBeenCalledTimes(1);
  });

  it('hides verification modal when initially rendering the page, and opens it on click', async () => {
    const user = userEvent.setup();
    render(<PolicyEditor {...defaultProps} />);

    const modalTitle = screen.queryByRole('heading', {
      name: textMock('policy_editor.verification_modal_heading'),
      level: 1,
    });
    expect(modalTitle).not.toBeInTheDocument();

    const [moreButton] = screen.getAllByRole('button', { name: textMock('policy_editor.more') });
    await act(() => user.click(moreButton));

    const deleteButton = screen.getByRole('menuitem', { name: textMock('general.delete') });
    await act(() => user.click(deleteButton));

    const modalTitleAfter = screen.getByRole('heading', {
      name: textMock('policy_editor.verification_modal_heading'),
      level: 1,
    });
    expect(modalTitleAfter).toBeInTheDocument();
  });
});
