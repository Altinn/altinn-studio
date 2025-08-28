import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PolicyResourceFieldsProps } from './PolicyResourceFields';
import { PolicyResourceFields } from './PolicyResourceFields';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { PolicyEditorContext } from '../../../../../../contexts/PolicyEditorContext';
import { PolicyRuleContext } from '../../../../../../contexts/PolicyRuleContext';
import {
  mockPolicyEditorContextValue,
  mockPolicyEditorContextValueWithSingleNarrowingPolicy,
} from '../../../../../../../test/mocks/policyEditorContextMock';
import {
  mockPolicyRuleContextValue,
  mockPolicyRuleContextValueWithSingleNarrowingPolicy,
} from '../../../../../../../test/mocks/policyRuleContextMock';
import { mockResource11 } from '../../../../../../../test/mocks/policySubResourceMocks';

const mockValudNewText = '45';

const defaultProps: PolicyResourceFieldsProps = {
  resource: mockResource11,
  canEditTypeAndId: true,
  resourceIndex: 0,
  resourceNarrowingIndex: 0,
};

describe('PolicyResourceFields', () => {
  afterEach(jest.clearAllMocks);

  it('sets text fields to readonly when "canEditTypeAndId" is false', () => {
    renderPolicyResourceFieldsWithMultipleNarrowingPolicies({ canEditTypeAndId: false });

    const idInput = screen.getByLabelText(textMock('policy_editor.narrowing_list_field_id'));
    expect(idInput).toHaveAttribute('readonly');

    const typeInput = screen.getByLabelText(textMock('policy_editor.narrowing_list_field_type'));
    expect(typeInput).toHaveAttribute('readonly');
  });

  it('sets text fields to not be readonly when "canEditTypeAndId" is true', () => {
    renderPolicyResourceFieldsWithMultipleNarrowingPolicies();

    const idInput = screen.getByLabelText(textMock('policy_editor.narrowing_list_field_id'));
    expect(idInput).not.toHaveAttribute('readonly');

    const typeInput = screen.getByLabelText(textMock('policy_editor.narrowing_list_field_type'));
    expect(typeInput).not.toHaveAttribute('readonly');
  });

  it('calls "setPolicyRules" when id input values change', async () => {
    const user = userEvent.setup();
    renderPolicyResourceFieldsWithMultipleNarrowingPolicies();

    const idInput = screen.getByLabelText(textMock('policy_editor.narrowing_list_field_id'));

    await user.type(idInput, mockValudNewText);

    expect(mockPolicyEditorContextValue.setPolicyRules).toHaveBeenCalledTimes(
      mockValudNewText.length,
    );
  });

  it('calls "setPolicyRules" when type input values change', async () => {
    const user = userEvent.setup();
    renderPolicyResourceFieldsWithMultipleNarrowingPolicies();

    const typeInput = screen.getByLabelText(textMock('policy_editor.narrowing_list_field_type'));

    await user.type(typeInput, mockValudNewText);

    expect(mockPolicyEditorContextValue.setPolicyRules).toHaveBeenCalledTimes(
      mockValudNewText.length,
    );
  });

  it('calls "savePolicy" when input fields lose focus', async () => {
    const user = userEvent.setup();
    renderPolicyResourceFieldsWithMultipleNarrowingPolicies();

    const typeInput = screen.getByLabelText(textMock('policy_editor.narrowing_list_field_type'));

    await user.type(typeInput, mockValudNewText);
    await user.tab();
    expect(mockPolicyEditorContextValue.savePolicy).toHaveBeenCalledTimes(1);
  });

  it('renders the delete button when there are multiple narrowing policies', () => {
    renderPolicyResourceFieldsWithMultipleNarrowingPolicies();

    const deleteButton = screen.queryByRole('button', {
      name: textMock('policy_editor.narrowing_list_field_delete'),
    });

    expect(deleteButton).toBeInTheDocument();
  });

  it('hides the delete button when there is only a single narrowing policy', () => {
    renderPolicyResourceFieldsWithSingleNarrowingPolicy();

    const deleteButton = screen.queryByRole('button', {
      name: textMock('policy_editor.narrowing_list_field_delete'),
    });

    expect(deleteButton).not.toBeInTheDocument();
  });

  it('calls "setPolicyRules" and "savePolicy" when delete button is clicked', async () => {
    const user = userEvent.setup();
    renderPolicyResourceFieldsWithMultipleNarrowingPolicies();

    const deleteButton = screen.getByRole('button', {
      name: textMock('policy_editor.narrowing_list_field_delete'),
    });

    expect(deleteButton).toBeInTheDocument();

    await user.click(deleteButton);

    expect(mockPolicyEditorContextValue.setPolicyRules).toHaveBeenCalledTimes(1);
    expect(mockPolicyEditorContextValue.savePolicy).toHaveBeenCalledTimes(1);
  });

  it('hides the delete button when there are multiple narrowing policies and "canEditTypeAndId" is false', () => {
    renderPolicyResourceFieldsWithMultipleNarrowingPolicies({ canEditTypeAndId: false });

    const deleteButton = screen.queryByRole('button', {
      name: textMock('policy_editor.narrowing_list_field_delete'),
    });

    expect(deleteButton).not.toBeInTheDocument();
  });
});

const renderPolicyResourceFieldsWithMultipleNarrowingPolicies = (
  policyResourceFieldsProps: Partial<PolicyResourceFieldsProps> = {},
) => {
  return render(
    <PolicyEditorContext.Provider value={mockPolicyEditorContextValue}>
      <PolicyRuleContext.Provider value={mockPolicyRuleContextValue}>
        <PolicyResourceFields {...defaultProps} {...policyResourceFieldsProps} />
      </PolicyRuleContext.Provider>
    </PolicyEditorContext.Provider>,
  );
};

const renderPolicyResourceFieldsWithSingleNarrowingPolicy = (
  policyResourceFieldsProps: Partial<PolicyResourceFieldsProps> = {},
) => {
  return render(
    <PolicyEditorContext.Provider value={mockPolicyEditorContextValueWithSingleNarrowingPolicy}>
      <PolicyRuleContext.Provider value={mockPolicyRuleContextValueWithSingleNarrowingPolicy}>
        <PolicyResourceFields {...defaultProps} {...policyResourceFieldsProps} />
      </PolicyRuleContext.Provider>
    </PolicyEditorContext.Provider>,
  );
};
