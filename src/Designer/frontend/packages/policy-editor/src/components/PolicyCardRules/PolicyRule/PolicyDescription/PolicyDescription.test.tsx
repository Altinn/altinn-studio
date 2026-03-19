import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PolicyDescription } from './PolicyDescription';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { PolicyEditorContext } from '../../../../contexts/PolicyEditorContext';
import { PolicyRuleContext } from '../../../../contexts/PolicyRuleContext';
import { mockPolicyEditorContextValue } from '../../../../../test/mocks/policyEditorContextMock';
import { mockPolicyRuleContextValue } from '../../../../../test/mocks/policyRuleContextMock';
import { mockPolicyRuleCard1 } from '../../../../../test/mocks/policyRuleMocks';
import { renderAndRunTimers } from '@studio/ui-test';

describe('PolicyDescription', () => {
  it('calls "setPolicyRules" when description field is edited', async () => {
    const user = userEvent.setup();
    renderPolicyDescription();

    const [descriptionField] = screen.getAllByLabelText(
      textMock('policy_editor.rule_card_description_title'),
    );
    expect(descriptionField).toHaveValue(mockPolicyRuleCard1.description);
    await user.type(descriptionField, '1');

    expect(mockPolicyEditorContextValue.setPolicyRules).toHaveBeenCalledTimes(1);
  });
});

const renderPolicyDescription = () => {
  return renderAndRunTimers(
    <PolicyEditorContext.Provider value={mockPolicyEditorContextValue}>
      <PolicyRuleContext.Provider value={mockPolicyRuleContextValue}>
        <PolicyDescription />
      </PolicyRuleContext.Provider>
    </PolicyEditorContext.Provider>,
  );
};
