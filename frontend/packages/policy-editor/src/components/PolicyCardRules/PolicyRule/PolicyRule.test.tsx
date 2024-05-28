import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PolicyRule, type PolicyRuleProps } from './PolicyRule';
import { textMock } from '@studio/testing/mocks/i18nMock';
import {
  mockActionId1,
  mockActionId2,
  mockActionId3,
  mockActionId4,
} from '../../../../test/mocks/policyActionMocks';
import { mockPolicyRuleCard1 } from '../../../../test/mocks/policyRuleMocks';
import {
  mockSubjectTitle1,
  mockSubjectTitle2,
  mockSubjectTitle3,
} from '../../../../test/mocks/policySubjectMocks';
import {
  PolicyEditorContext,
  type PolicyEditorContextProps,
} from '../../../contexts/PolicyEditorContext';
import { mockPolicyEditorContextValue } from '../../../../test/mocks/policyEditorContextMock';

const mockActionOption1: string = textMock(`policy_editor.action_${mockActionId1}`);
const mockActionOption2: string = textMock(`policy_editor.action_${mockActionId2}`);
const mockActionOption3: string = textMock(`policy_editor.action_${mockActionId3}`);
const mockActionOption4: string = mockActionId4;

const mockHandleCloneRule = jest.fn();
const mockHandleDeleteRule = jest.fn();

const defaultProps: PolicyRuleProps = {
  policyRule: mockPolicyRuleCard1,
  handleCloneRule: mockHandleCloneRule,
  handleDeleteRule: mockHandleDeleteRule,
  showErrors: false,
};

describe('PolicyRule', () => {
  afterEach(jest.clearAllMocks);

  it('calls "handleCloneRule" when the clone button is clicked', async () => {
    const user = userEvent.setup();
    renderPolicyRule();

    const [moreButton] = screen.getAllByRole('button', { name: textMock('policy_editor.more') });
    await user.click(moreButton);

    const [cloneButton] = screen.getAllByRole('menuitem', {
      name: textMock('policy_editor.expandable_card_dropdown_copy'),
    });
    await user.click(cloneButton);

    expect(mockHandleCloneRule).toHaveBeenCalledTimes(1);
  });

  it('calls "handleDeleteRule" when the delete button is clicked', async () => {
    const user = userEvent.setup();
    renderPolicyRule();

    const [moreButton] = screen.getAllByRole('button', { name: textMock('policy_editor.more') });
    await user.click(moreButton);

    const [deleteButton] = screen.getAllByRole('menuitem', { name: textMock('general.delete') });
    await user.click(deleteButton);

    expect(mockHandleDeleteRule).toHaveBeenCalledTimes(1);
  });

  it('displays the selected actions as Chips', async () => {
    const user = userEvent.setup();
    renderPolicyRule();

    const selectedAction1 = screen.getByLabelText(
      `${textMock('general.delete')} ${mockActionOption1}`,
    );
    const selectedAction2 = screen.getByLabelText(
      `${textMock('general.delete')} ${mockActionOption2}`,
    );
    const selectedAction3 = screen.queryByLabelText(
      `${textMock('general.delete')} ${mockActionOption3}`,
    );
    const selectedAction4 = screen.getByLabelText(
      `${textMock('general.delete')} ${mockActionOption4}`,
    );
    expect(selectedAction1).toBeInTheDocument();
    expect(selectedAction2).toBeInTheDocument();
    expect(selectedAction3).not.toBeInTheDocument();
    expect(selectedAction4).toBeInTheDocument();

    const [actionSelect] = screen.getAllByLabelText(
      textMock('policy_editor.rule_card_actions_title'),
    );
    await user.click(actionSelect);

    const optionAction1 = screen.queryByRole('option', { name: mockActionOption1 });
    const optionAction2 = screen.queryByRole('option', { name: mockActionOption2 });
    const optionAction3 = screen.getByRole('option', { name: mockActionOption3 });
    const optionAction4 = screen.queryByRole('option', { name: mockActionOption4 });

    expect(optionAction1).not.toBeInTheDocument();
    expect(optionAction2).not.toBeInTheDocument();
    expect(optionAction3).toBeInTheDocument();
    expect(optionAction4).not.toBeInTheDocument();

    await user.click(screen.getByRole('option', { name: mockActionOption3 }));

    expect(mockPolicyEditorContextValue.setPolicyRules).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByLabelText(`${textMock('general.delete')} ${mockActionOption3}`),
    ).not.toBeInTheDocument();

    const [inputAllSelected] = screen.getAllByText(
      textMock('policy_editor.rule_card_actions_select_all_selected'),
    );
    expect(inputAllSelected).toBeInTheDocument();
  });

  it('calls "setPolicyRules" when subjects are edited', async () => {
    const user = userEvent.setup();
    renderPolicyRule();

    const selectedSubject1 = screen.getByLabelText(
      `${textMock('general.delete')} ${mockSubjectTitle1}`,
    );
    const selectedSubject2 = screen.queryByLabelText(
      `${textMock('general.delete')} ${mockSubjectTitle2}`,
    );
    const selectedSubject3 = screen.getByLabelText(
      `${textMock('general.delete')} ${mockSubjectTitle3}`,
    );
    expect(selectedSubject1).toBeInTheDocument();
    expect(selectedSubject2).not.toBeInTheDocument();
    expect(selectedSubject3).toBeInTheDocument();

    const [subjectSelect] = screen.getAllByLabelText(
      textMock('policy_editor.rule_card_subjects_title'),
    );
    await user.click(subjectSelect);

    const optionSubject1 = screen.queryByRole('option', { name: mockSubjectTitle1 });
    const optionSubject2 = screen.getByRole('option', { name: mockSubjectTitle2 });
    const optionSubject3 = screen.queryByRole('option', { name: mockSubjectTitle3 });

    expect(optionSubject1).not.toBeInTheDocument();
    expect(optionSubject2).toBeInTheDocument();
    expect(optionSubject3).not.toBeInTheDocument();

    await user.click(screen.getByRole('option', { name: mockSubjectTitle2 }));

    expect(mockPolicyEditorContextValue.setPolicyRules).toHaveBeenCalledTimes(1);

    expect(
      screen.queryByLabelText(`${textMock('general.delete')} ${mockSubjectTitle2}`),
    ).not.toBeInTheDocument();

    const [inputAllSelected] = screen.getAllByText(
      textMock('policy_editor.rule_card_subjects_select_all_selected'),
    );
    expect(inputAllSelected).toBeInTheDocument();
  });

  it('should append subject to selectable subject options list when selected subject is removed', async () => {
    const user = userEvent.setup();
    renderPolicyRule();

    const [subjectSelect] = screen.getAllByLabelText(
      textMock('policy_editor.rule_card_subjects_title'),
    );
    await user.click(subjectSelect);

    expect(screen.queryByRole('option', { name: mockSubjectTitle1 })).toBeNull();

    const selectedSubject = screen.getByLabelText(
      `${textMock('general.delete')} ${mockSubjectTitle1}`,
    );
    await user.click(selectedSubject);

    await user.click(subjectSelect);
    expect(screen.getByRole('option', { name: mockSubjectTitle1 })).toBeInTheDocument();
  });

  it('calls "setPolicyRules" when description field is edited', async () => {
    const user = userEvent.setup();
    renderPolicyRule();

    const [descriptionField] = screen.getAllByLabelText(
      textMock('policy_editor.rule_card_description_title'),
    );
    expect(descriptionField).toHaveValue(mockPolicyRuleCard1.description);
    await user.type(descriptionField, '1');

    expect(mockPolicyEditorContextValue.setPolicyRules).toHaveBeenCalledTimes(1);
  });

  it('calls "savePolicy" when input fields are blurred', async () => {
    const user = userEvent.setup();
    renderPolicyRule();

    const [typeInput] = screen.getAllByLabelText(
      textMock('policy_editor.narrowing_list_field_type'),
    );
    const [idInput] = screen.getAllByLabelText(textMock('policy_editor.narrowing_list_field_id'));

    const newWord: string = 'test';
    await user.type(typeInput, newWord);
    await user.tab();
    await user.type(idInput, newWord);
    await user.tab();

    const [actionSelect] = screen.getAllByLabelText(
      textMock('policy_editor.rule_card_actions_title'),
    );
    await user.click(actionSelect);

    const actionOption: string = textMock(`policy_editor.action_${mockActionId3}`);
    await user.click(screen.getByRole('option', { name: actionOption }));
    await user.tab();

    const [subjectSelect] = screen.getAllByLabelText(
      textMock('policy_editor.rule_card_subjects_title'),
    );
    await user.click(subjectSelect);
    await user.click(screen.getByRole('option', { name: mockSubjectTitle2 }));
    await user.tab();

    const [descriptionField] = screen.getAllByLabelText(
      textMock('policy_editor.rule_card_description_title'),
    );
    expect(descriptionField).toHaveValue(mockPolicyRuleCard1.description);
    await user.type(descriptionField, newWord);
    await user.tab();

    const numFields = 5;
    expect(mockPolicyEditorContextValue.savePolicy).toHaveBeenCalledTimes(numFields);
  });
});

const renderPolicyRule = (policyEditorContextProps: Partial<PolicyEditorContextProps> = {}) => {
  return render(
    <PolicyEditorContext.Provider
      value={{ ...mockPolicyEditorContextValue, ...policyEditorContextProps }}
    >
      <PolicyRule {...defaultProps} />
    </PolicyEditorContext.Provider>,
  );
};
