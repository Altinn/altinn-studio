import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ExpandablePolicyCardProps } from './ExpandablePolicyCard';
import { ExpandablePolicyCard } from './ExpandablePolicyCard';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import type { PolicyEditorUsage } from '../../types';
import {
  mockActionId1,
  mockActionId2,
  mockActionId3,
  mockActionId4,
  mockActions,
  mockPolicyRuleCard1,
  mockPolicyRuleCards,
  mockResourceType1,
  mockResourecId1,
  mockSubjectTitle1,
  mockSubjectTitle2,
  mockSubjectTitle3,
  mockSubjects,
} from '../../data-mocks';

const mockUsageType: PolicyEditorUsage = 'app';

const mockActionOption1: string = textMock(`policy_editor.action_${mockActionId1}`);
const mockActionOption2: string = textMock(`policy_editor.action_${mockActionId2}`);
const mockActionOption3: string = textMock(`policy_editor.action_${mockActionId3}`);
const mockActionOption4: string = mockActionId4;

describe('ExpandablePolicyCard', () => {
  afterEach(jest.clearAllMocks);

  const mockSetPolicyRules = jest.fn();
  const mockHandleCloneRule = jest.fn();
  const mockHandleDeleteRule = jest.fn();
  const mockSavePolicy = jest.fn();

  const defaultProps: ExpandablePolicyCardProps = {
    policyRule: mockPolicyRuleCard1,
    actions: mockActions,
    subjects: mockSubjects,
    rules: mockPolicyRuleCards,
    setPolicyRules: mockSetPolicyRules,
    resourceId: mockResourecId1,
    resourceType: mockResourceType1,
    handleCloneRule: mockHandleCloneRule,
    handleDeleteRule: mockHandleDeleteRule,
    showErrors: false,
    savePolicy: mockSavePolicy,
    usageType: mockUsageType,
  };

  it('calls "handleCloneRule" when the clone button is clicked', async () => {
    const user = userEvent.setup();
    render(<ExpandablePolicyCard {...defaultProps} />);

    const [moreButton] = screen.getAllByRole('button', { name: textMock('policy_editor.more') });
    user.click(moreButton);

    const [cloneButton] = await screen.findAllByRole('menuitem', {
      name: textMock('policy_editor.expandable_card_dropdown_copy'),
    });
    user.click(cloneButton);

    await waitFor(() => expect(mockHandleCloneRule).toHaveBeenCalledTimes(1));
  });

  it('calls "handleDeleteRule" when the delete button is clicked', async () => {
    const user = userEvent.setup();
    render(<ExpandablePolicyCard {...defaultProps} />);

    const [moreButton] = screen.getAllByRole('button', { name: textMock('policy_editor.more') });
    user.click(moreButton);

    const [deleteButton] = await screen.findAllByRole('menuitem', {
      name: textMock('general.delete'),
    });
    user.click(deleteButton);

    await waitFor(() => expect(mockHandleDeleteRule).toHaveBeenCalledTimes(1));
  });

  it('calls "setPolicyRules" when sub-resource fields are edited', async () => {
    const user = userEvent.setup();
    render(<ExpandablePolicyCard {...defaultProps} />);

    const [typeInput] = screen.getAllByLabelText(
      textMock('policy_editor.narrowing_list_field_type'),
    );
    const [idInput] = screen.getAllByLabelText(textMock('policy_editor.narrowing_list_field_id'));

    const newWord: string = 'test';

    user.type(typeInput, newWord);
    await waitFor(() => expect(mockSetPolicyRules).toHaveBeenCalledTimes(newWord.length));

    mockSetPolicyRules.mockClear();

    user.type(idInput, newWord);
    await waitFor(() => expect(mockSetPolicyRules).toHaveBeenCalledTimes(newWord.length));
  });

  it('displays the selected actions as Chips', async () => {
    const user = userEvent.setup();
    render(<ExpandablePolicyCard {...defaultProps} />);

    // Check that the selected actions are present
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
    expect(selectedAction3).not.toBeInTheDocument(); // 3 is not in the resource
    expect(selectedAction4).toBeInTheDocument();

    // Open the select
    const [actionSelect] = screen.getAllByLabelText(
      textMock('policy_editor.rule_card_actions_title'),
    );
    await waitFor(() => user.click(actionSelect));

    // Check that the selected actions are not in the document
    const optionAction1 = screen.queryByRole('option', { name: mockActionOption1 });
    const optionAction2 = screen.queryByRole('option', { name: mockActionOption2 });
    const optionAction3 = screen.getByRole('option', { name: mockActionOption3 });
    const optionAction4 = screen.queryByRole('option', { name: mockActionOption4 });

    expect(optionAction1).not.toBeInTheDocument();
    expect(optionAction2).not.toBeInTheDocument();
    expect(optionAction3).toBeInTheDocument(); // 3 is in the resource
    expect(optionAction4).not.toBeInTheDocument();

    // Click the final action
    const optionAction3Element = screen.getByRole('option', { name: mockActionOption3 });
    user.click(optionAction3Element);

    await waitFor(() => expect(mockSetPolicyRules).toHaveBeenCalledTimes(1));

    // Expect the option clicked to be removed from the screen
    expect(
      screen.queryByLabelText(`${textMock('general.delete')} ${mockActionOption3}`),
    ).not.toBeInTheDocument();

    // Expect the label with all selected to be present
    const [inputAllSelected] = screen.getAllByText(
      textMock('policy_editor.rule_card_actions_select_all_selected'),
    );
    expect(inputAllSelected).toBeInTheDocument();
  });

  it('calls "setPolicyRules" when subjects are edited', async () => {
    const user = userEvent.setup();
    render(<ExpandablePolicyCard {...defaultProps} />);

    // Check that the selected subjects are present
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
    expect(selectedSubject2).not.toBeInTheDocument(); // 2 is not in the resource
    expect(selectedSubject3).toBeInTheDocument();

    // Open the select
    const [subjectSelect] = screen.getAllByLabelText(
      textMock('policy_editor.rule_card_subjects_title'),
    );
    await waitFor(() => user.click(subjectSelect));

    // Check that the selected subjects are not in the document
    const optionSubject1 = screen.queryByRole('option', { name: mockSubjectTitle1 });
    const optionSubject2 = screen.getByRole('option', { name: mockSubjectTitle2 });
    const optionSubject3 = screen.queryByRole('option', { name: mockSubjectTitle3 });

    expect(optionSubject1).not.toBeInTheDocument();
    expect(optionSubject2).toBeInTheDocument(); // 2 is in the resource
    expect(optionSubject3).not.toBeInTheDocument();

    // Click the final subject
    user.click(screen.getByRole('option', { name: mockSubjectTitle2 }));

    await waitFor(() => expect(mockSetPolicyRules).toHaveBeenCalledTimes(1));

    // Expect the option clicked to be removed from the screen
    expect(
      screen.queryByLabelText(`${textMock('general.delete')} ${mockSubjectTitle2}`),
    ).not.toBeInTheDocument();

    // Expect the label with all selected to be present
    const [inputAllSelected] = screen.getAllByText(
      textMock('policy_editor.rule_card_subjects_select_all_selected'),
    );
    expect(inputAllSelected).toBeInTheDocument();
  });

  it('should append subject to selectable subject options list when selected subject is removed', async () => {
    const user = userEvent.setup();
    render(<ExpandablePolicyCard {...defaultProps} />);

    const [subjectSelect] = screen.getAllByLabelText(
      textMock('policy_editor.rule_card_subjects_title'),
    );
    user.click(subjectSelect);

    // Check that already selected options does not be included within selectable list.
    await waitFor(() =>
      expect(screen.queryByRole('option', { name: mockSubjectTitle1 })).toBeNull(),
    );

    // Remove the selected subject
    const selectedSubject = screen.getByLabelText(
      `${textMock('general.delete')} ${mockSubjectTitle1}`,
    );
    user.click(selectedSubject);

    // Open the select and verify that the removed subject is now appended to the selectable list
    user.click(subjectSelect);
    const optionSubject1 = await screen.findByRole('option', { name: mockSubjectTitle1 });
    expect(optionSubject1).toBeInTheDocument();
  });

  it('calls "setPolicyRules" when description field is edited', async () => {
    const user = userEvent.setup();
    render(<ExpandablePolicyCard {...defaultProps} />);

    const [descriptionField] = screen.getAllByLabelText(
      textMock('policy_editor.rule_card_description_title'),
    );
    expect(descriptionField).toHaveValue(mockPolicyRuleCard1.description);
    user.type(descriptionField, '1');

    await waitFor(() => expect(mockSetPolicyRules).toHaveBeenCalledTimes(1));
  });

  it('calls "savePolicy" when input fields are blurred', async () => {
    const user = userEvent.setup();
    render(<ExpandablePolicyCard {...defaultProps} />);

    const [typeInput] = screen.getAllByLabelText(
      textMock('policy_editor.narrowing_list_field_type'),
    );
    const [idInput] = screen.getAllByLabelText(textMock('policy_editor.narrowing_list_field_id'));

    const newWord: string = 'test';
    await waitFor(() => user.type(typeInput, newWord));
    user.tab();
    await waitFor(() => user.type(idInput, newWord));
    user.tab();

    const [actionSelect] = await screen.findAllByLabelText(
      textMock('policy_editor.rule_card_actions_title'),
    );
    user.click(actionSelect);

    const actionOption: string = textMock(`policy_editor.action_${mockActionId3}`);
    user.click(await screen.findByRole('option', { name: actionOption }));
    user.tab();

    const [subjectSelect] = screen.getAllByLabelText(
      textMock('policy_editor.rule_card_subjects_title'),
    );
    user.click(subjectSelect);
    user.click(await screen.findByRole('option', { name: mockSubjectTitle2 }));
    user.tab();

    const [descriptionField] = screen.getAllByLabelText(
      textMock('policy_editor.rule_card_description_title'),
    );
    expect(descriptionField).toHaveValue(mockPolicyRuleCard1.description);
    await waitFor(() => user.type(descriptionField, newWord));
    user.tab();

    const numFields = 5;
    await waitFor(() => expect(mockSavePolicy).toHaveBeenCalledTimes(numFields));
  });
});
