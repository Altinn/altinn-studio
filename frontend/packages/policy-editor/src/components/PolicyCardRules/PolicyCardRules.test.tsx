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

const defaultProps: PolicyCardRulesProps = {
  showErrorsOnAllRulesAboveNew: false,
};

describe('PolicyCardRule', () => {
  afterEach(jest.clearAllMocks);

  it('displays the rules when there are more than 0 rules', async () => {
    const user = userEvent.setup();
    renderPolicyCardRules();

    const subResourceLabel = screen.getAllByText(
      textMock('policy_editor.rule_card_sub_resource_title'),
    );

    await user.tab();

    expect(subResourceLabel.length).toEqual(mockPolicyEditorContextValue.policyRules.length);
  });

  it('displays no rules when the policy has no rules', async () => {
    const user = userEvent.setup();
    renderPolicyCardRules({ policyRules: [] });

    const subResourceLabel = screen.queryAllByText(
      textMock('policy_editor.rule_card_sub_resource_title'),
    );

    await user.tab();

    expect(subResourceLabel.length).toEqual(0);
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
