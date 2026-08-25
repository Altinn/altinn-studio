import { render, screen, within } from '@testing-library/react';
import { PolicyActions } from './PolicyActions';
import { textMock } from '@studio/testing/mocks/i18nMock';
import {
  mockActionId1,
  mockActionId2,
  mockActionId3,
  mockActionId4,
} from '../../../../../test/mocks/policyActionMocks';
import { PolicyEditorContext } from '../../../../contexts/PolicyEditorContext';
import { PolicyRuleContext } from '../../../../contexts/PolicyRuleContext';
import { mockPolicyEditorContextValue } from '../../../../../test/mocks/policyEditorContextMock';
import { mockPolicyRuleContextValue } from '../../../../../test/mocks/policyRuleContextMock';

const mockActionOption1: string = textMock(`policy_editor.action_${mockActionId1}`);
const mockActionOption2: string = textMock(`policy_editor.action_${mockActionId2}`);
const mockActionOption3: string = textMock(`policy_editor.action_${mockActionId3}`);
const mockActionOption4: string = mockActionId4;

describe('PolicyActions', () => {
  afterEach(jest.clearAllMocks);

  it('renders the action field with its description', () => {
    renderPolicyActions();

    expect(
      screen.getByLabelText(textMock('policy_editor.rule_card_actions_title')),
    ).toBeInTheDocument();
    expect(
      screen.getByText(textMock('policy_editor.rule_card_actions_select_add')),
    ).toBeInTheDocument();
  });

  it('offers every available action as an option', () => {
    renderPolicyActions();

    const options = within(getOptionList()).getAllByRole('option', { hidden: true });
    expect(options.map((option) => option.textContent)).toEqual([
      mockActionOption1,
      mockActionOption2,
      mockActionOption3,
      mockActionOption4,
    ]);
  });

  it('displays the actions of the rule as selected values, using their translated names', () => {
    renderPolicyActions();

    // A selected action is rendered both as a selected value and as an option
    expect(screen.getAllByText(mockActionOption1)).toHaveLength(2);
    expect(screen.getAllByText(mockActionOption4)).toHaveLength(2);
    expect(screen.getAllByText(mockActionOption3)).toHaveLength(1);
  });

  it('displays the description for all actions being selected when none are left', () => {
    renderPolicyActions({
      policyRule: {
        ...mockPolicyRuleContextValue.policyRule,
        actions: [mockActionId1, mockActionId2, mockActionId3, mockActionId4],
      },
    });

    expect(
      screen.getByText(textMock('policy_editor.rule_card_actions_select_all_selected')),
    ).toBeInTheDocument();
  });

  it('displays the error message when the rule has an action error and all errors are shown', () => {
    renderPolicyActions({
      showAllErrors: true,
      policyError: { ...mockPolicyRuleContextValue.policyError, actionsError: true },
    });

    expect(screen.getByText(textMock('policy_editor.rule_card_actions_error'))).toBeInTheDocument();
  });
});

const getOptionList = (): HTMLElement => screen.getByRole('listbox', { hidden: true });

const renderPolicyActions = (ruleContextProps: Partial<typeof mockPolicyRuleContextValue> = {}) => {
  return render(
    <PolicyEditorContext.Provider value={mockPolicyEditorContextValue}>
      <PolicyRuleContext.Provider value={{ ...mockPolicyRuleContextValue, ...ruleContextProps }}>
        <PolicyActions />
      </PolicyRuleContext.Provider>
    </PolicyEditorContext.Provider>,
  );
};
