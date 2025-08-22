import React from 'react';
import { render, screen } from '@testing-library/react';
import { AddPolicyRuleButton, type AddPolicyRuleButtonProps } from './AddPolicyRuleButton';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { PolicyEditorContext } from '../../contexts/PolicyEditorContext';
import { mockPolicyEditorContextValue } from '../../../test/mocks/policyEditorContextMock';

const mockOnClick = jest.fn();
const defaultProps: AddPolicyRuleButtonProps = {
  onClick: mockOnClick,
};

describe('AddPolicyRuleButton', () => {
  afterEach(jest.clearAllMocks);

  it('calls the onClick function when clicked', async () => {
    const user = userEvent.setup();
    renderAddPolicyRuleButton();

    const buttonElement = screen.getByRole('button', {
      name: textMock('policy_editor.card_button_text'),
    });
    await user.click(buttonElement);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('calls "savePolicy" when a new rule is added', async () => {
    const user = userEvent.setup();
    renderAddPolicyRuleButton();

    const addButton = screen.getByRole('button', {
      name: textMock('policy_editor.card_button_text'),
    });

    await user.click(addButton);

    expect(mockPolicyEditorContextValue.savePolicy).toHaveBeenCalledTimes(1);
  });
});

const renderAddPolicyRuleButton = () => {
  return render(
    <PolicyEditorContext.Provider value={mockPolicyEditorContextValue}>
      <AddPolicyRuleButton {...defaultProps} />
    </PolicyEditorContext.Provider>,
  );
};
