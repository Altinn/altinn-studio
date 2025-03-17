import React from 'react';
import { PolicyRulesEditor } from './PolicyRulesEditor';
import { mockPolicyEditorContextValue } from '../../../test/mocks/policyEditorContextMock';
import { PolicyEditorContext } from '../../contexts/PolicyEditorContext';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { mockPolicyRules } from '../../../test/mocks/policyRuleMocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { Policy, RequiredAuthLevel } from '../../types';

const mockRequiredAuthLevel: RequiredAuthLevel = '3';

const mockPolicy: Policy = {
  rules: mockPolicyRules,
  requiredAuthenticationLevelEndUser: mockRequiredAuthLevel,
  requiredAuthenticationLevelOrg: '3',
};

describe('PolicyRulesEditor', () => {
  it('displays the correct number of policy rules', () => {
    renderPolicyRulesEditor();
    const aLabelFromPolicyCard = screen.getAllByRole('button', {
      name: textMock('policy_editor.more'),
    });
    expect(aLabelFromPolicyCard.length).toEqual(mockPolicy.rules.length);
  });

  it('increases the rule list length when add rule button is clicked', async () => {
    const user = userEvent.setup();
    renderPolicyRulesEditor();

    const addButton = screen.getByRole('button', {
      name: textMock('policy_editor.card_button_text'),
    });

    await user.click(addButton);

    expect(mockPolicyEditorContextValue.savePolicy).toHaveBeenCalledTimes(1);
  });
});

const renderPolicyRulesEditor = () => {
  return render(
    <PolicyEditorContext.Provider value={mockPolicyEditorContextValue}>
      <PolicyRulesEditor />
    </PolicyEditorContext.Provider>,
  );
};
