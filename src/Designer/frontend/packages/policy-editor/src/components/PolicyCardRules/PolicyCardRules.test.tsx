import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PolicyCardRules, type PolicyCardRulesProps } from './PolicyCardRules';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { mockPolicyEditorContextValue } from '../../../test/mocks/policyEditorContextMock';
import {
  PolicyEditorContext,
  type PolicyEditorContextProps,
} from '../../contexts/PolicyEditorContext';
import type { PolicyRuleCard } from '../../types';
import { getPolicyRuleIdString } from '../../utils/PolicyRuleUtils';

const defaultProps: PolicyCardRulesProps = {
  showErrorsOnAllRulesAboveNew: false,
};

describe('PolicyCardRule', () => {
  afterEach(jest.clearAllMocks);

  it.each(mockPolicyEditorContextValue.policyRules)(
    'displays the rules when there are more than 0 rules',
    async (rule: PolicyRuleCard) => {
      const user = userEvent.setup();
      renderPolicyCardRules();

      const ruleTitle = screen.getByText(
        `${textMock('policy_editor.rule')} ${getPolicyRuleIdString(rule)}`,
      );

      await user.tab();

      expect(ruleTitle).toBeInTheDocument();
    },
  );

  it('displays alert when the policy has no rules', async () => {
    renderPolicyCardRules({ policyRules: [] });

    const cardButton = screen.queryAllByRole('button');

    expect(cardButton.length).toEqual(0);
  });
});

const renderPolicyCardRules = (
  policyEditorContextProps: Partial<PolicyEditorContextProps> = {},
) => {
  return render(
    <PolicyEditorContext.Provider
      value={{ ...mockPolicyEditorContextValue, ...policyEditorContextProps }}
    >
      <PolicyCardRules {...defaultProps} />
    </PolicyEditorContext.Provider>,
  );
};
