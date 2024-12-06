import React from 'react';
import { render, screen } from '@testing-library/react';
import { PolicyRuleErrorMessage } from './PolicyRuleErrorMessage';
import { PolicyEditorContext } from '../../../../contexts/PolicyEditorContext';
import {
  PolicyRuleContext,
  type PolicyRuleContextProps,
} from '../../../../contexts/PolicyRuleContext';
import { mockPolicyEditorContextValue } from '../../../../../test/mocks/policyEditorContextMock';
import { mockPolicyRuleContextValue } from '../../../../../test/mocks/policyRuleContextMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { type PolicyError } from '../../../../types';

const policyError: PolicyError = mockPolicyRuleContextValue.policyError;
const ruleId: string = mockPolicyRuleContextValue.policyRule.ruleId;

const errorText1 = textMock('policy_editor.policy_rule_missing_1', {
  ruleId,
  missing: textMock('policy_editor.policy_rule_missing_sub_resource'),
});
const errorText2 = textMock('policy_editor.policy_rule_missing_2', {
  ruleId,
  missing1: textMock('policy_editor.policy_rule_missing_sub_resource'),
  missing2: textMock('policy_editor.policy_rule_missing_actions'),
});
const errorText3 = textMock('policy_editor.policy_rule_missing_3', {
  ruleId,
  missing1: textMock('policy_editor.policy_rule_missing_sub_resource'),
  missing2: textMock('policy_editor.policy_rule_missing_actions'),
  missing3: textMock('policy_editor.policy_rule_missing_subjects'),
});

describe('PolicyRuleErrorMessage', () => {
  afterEach(jest.clearAllMocks);

  it('renders error message when only one error exists', () => {
    renderPolicyRuleErrorMessage({
      policyError: { ...policyError, resourceError: true },
    });
    expect(screen.getByText(errorText1)).toBeInTheDocument();
  });

  it('renders error message when two errors exist', () => {
    renderPolicyRuleErrorMessage({
      policyError: {
        ...policyError,
        resourceError: true,
        actionsError: true,
      },
    });
    expect(screen.getByText(errorText2)).toBeInTheDocument();
  });

  it('renders error message when three errors exist', () => {
    renderPolicyRuleErrorMessage({
      policyError: {
        resourceError: true,
        actionsError: true,
        subjectsError: true,
      },
    });
    expect(screen.getByText(errorText3)).toBeInTheDocument();
  });

  it('does not render error message when no errors exist', () => {
    renderPolicyRuleErrorMessage();

    expect(screen.queryByText(errorText1)).not.toBeInTheDocument();
    expect(screen.queryByText(errorText2)).not.toBeInTheDocument();
    expect(screen.queryByText(errorText3)).not.toBeInTheDocument();
  });
});

const renderPolicyRuleErrorMessage = (
  policyRuleContextProps: Partial<PolicyRuleContextProps> = {},
) => {
  return render(
    <PolicyEditorContext.Provider value={mockPolicyEditorContextValue}>
      <PolicyRuleContext.Provider
        value={{ ...mockPolicyRuleContextValue, ...policyRuleContextProps }}
      >
        <PolicyRuleErrorMessage />
      </PolicyRuleContext.Provider>
    </PolicyEditorContext.Provider>,
  );
};
