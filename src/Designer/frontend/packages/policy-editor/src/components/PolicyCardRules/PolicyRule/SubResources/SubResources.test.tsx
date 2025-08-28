import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import {
  PolicyEditorContext,
  type PolicyEditorContextProps,
} from '../../../../contexts/PolicyEditorContext';
import { PolicyRuleContext } from '../../../../contexts/PolicyRuleContext';
import { mockPolicyEditorContextValue } from '../../../../../test/mocks/policyEditorContextMock';
import { mockPolicyRuleContextValue } from '../../../../../test/mocks/policyRuleContextMock';
import { SubResources } from './SubResources';

describe('SubResources', () => {
  it('calls "setPolicyRules" when sub-resource fields are edited', async () => {
    const user = userEvent.setup();

    const mockSetPolicyRules = jest.fn();
    renderSubResources({ setPolicyRules: mockSetPolicyRules });

    const toggleListButton = screen.getByRole('button', {
      name: `resource-1 - 1.2 ${textMock('policy_editor.expandable_card_open_icon')}`,
    });
    await user.click(toggleListButton);

    const [typeInput] = screen.getAllByLabelText(
      textMock('policy_editor.narrowing_list_field_type'),
    );
    const [idInput] = screen.getAllByLabelText(textMock('policy_editor.narrowing_list_field_id'));

    const newWord: string = 'test';

    await user.type(typeInput, newWord);
    expect(mockSetPolicyRules).toHaveBeenCalledTimes(newWord.length);

    mockSetPolicyRules.mockClear();

    await user.type(idInput, newWord);
    expect(mockSetPolicyRules).toHaveBeenCalledTimes(newWord.length);
  });
});

const renderSubResources = (policyEditorContextProps: Partial<PolicyEditorContextProps> = {}) => {
  return render(
    <PolicyEditorContext.Provider
      value={{ ...mockPolicyEditorContextValue, ...policyEditorContextProps }}
    >
      <PolicyRuleContext.Provider value={mockPolicyRuleContextValue}>
        <SubResources />
      </PolicyRuleContext.Provider>
    </PolicyEditorContext.Provider>,
  );
};
