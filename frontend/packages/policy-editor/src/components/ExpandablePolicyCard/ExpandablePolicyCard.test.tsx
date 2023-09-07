import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpandablePolicyCard, ExpandablePolicyCardProps } from './ExpandablePolicyCard';
import { act } from 'react-dom/test-utils';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import {
  PolicyAction,
  PolicyEditorUsage,
  PolicyRuleCard,
  PolicyRuleResource,
  PolicySubject,
} from '../../types';

const mockResourecId: string = 'resource-1';
const mockResourceType: string = 'urn:test';

const mockRuleId1: string = 'r1';
const mockRuleId2: string = 'r2';

const mockActionTitle1: string = 'Action 1';
const mockActionTitle2: string = 'Action 2';
const mockActionTitle3: string = 'Action 3';

const mockSubjectTitle1: string = 'Subject 1';
const mockSubjectTitle2: string = 'Subject 2';
const mockSubjectTitle3: string = 'Subject 3';

const mockResource11: PolicyRuleResource = { type: mockResourceType, id: mockResourecId };
const mockResource12: PolicyRuleResource = { type: 'urn:test.1.2', id: '1.2' };
const mockResource21: PolicyRuleResource = { type: 'urn:test.2.1', id: '2.1' };
const mockResource1: PolicyRuleResource[] = [mockResource11, mockResource12];
const mockResource2: PolicyRuleResource[] = [mockResource21];
const mockPolicyResources: PolicyRuleResource[][] = [mockResource1, mockResource2];

const mockPolicyRule1: PolicyRuleCard = {
  ruleId: mockRuleId1,
  description: '',
  subject: [mockSubjectTitle1, mockSubjectTitle3],
  actions: [mockActionTitle1, mockActionTitle2],
  resources: mockPolicyResources,
};
const mockPolicyRule2: PolicyRuleCard = {
  ruleId: mockRuleId2,
  description: '',
  subject: [],
  actions: [],
  resources: [[]],
};
const mockPolicyRules: PolicyRuleCard[] = [mockPolicyRule1, mockPolicyRule2];

const mockAction1: PolicyAction = {
  actionId: 'a1',
  actionTitle: mockActionTitle1,
  actionDescription: null,
};
const mockAction2: PolicyAction = {
  actionId: 'a2',
  actionTitle: mockActionTitle2,
  actionDescription: null,
};
const mockAction3: PolicyAction = {
  actionId: 'a3',
  actionTitle: mockActionTitle3,
  actionDescription: null,
};
const mockActions: PolicyAction[] = [mockAction1, mockAction2, mockAction3];

const mockSubject1: PolicySubject = {
  subjectId: 's1',
  subjectSource: 'Subject1',
  subjectTitle: mockSubjectTitle1,
  subjectDescription: '',
};
const mockSubject2: PolicySubject = {
  subjectId: 'a2',
  subjectSource: 'Subject2',
  subjectTitle: mockSubjectTitle2,
  subjectDescription: '',
};
const mockSubject3: PolicySubject = {
  subjectId: 'a3',
  subjectSource: 'Subject3',
  subjectTitle: mockSubjectTitle3,
  subjectDescription: '',
};
const mockSubjects: PolicySubject[] = [mockSubject1, mockSubject2, mockSubject3];

const mockUsageType: PolicyEditorUsage = 'app';

describe('ExpandablePolicyCard', () => {
  afterEach(jest.clearAllMocks);

  const mockSetPolicyRules = jest.fn();
  const mockHandleCloneRule = jest.fn();
  const mockHandleDeleteRule = jest.fn();
  const mockSavePolicy = jest.fn();

  const defaultProps: ExpandablePolicyCardProps = {
    policyRule: mockPolicyRule1,
    actions: mockActions,
    subjects: mockSubjects,
    rules: mockPolicyRules,
    setPolicyRules: mockSetPolicyRules,
    resourceId: mockResourecId,
    resourceType: mockResourceType,
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
    await act(() => user.click(moreButton));

    const [cloneButton] = screen.getAllByRole('button', {
      name: textMock('policy_editor.expandable_card_dropdown_copy'),
    });
    await act(() => user.click(cloneButton));

    expect(mockHandleCloneRule).toHaveBeenCalledTimes(1);
  });

  it('calls "handleDeleteRule" when the delete button is clicked', async () => {
    const user = userEvent.setup();
    render(<ExpandablePolicyCard {...defaultProps} />);

    const [moreButton] = screen.getAllByRole('button', { name: textMock('policy_editor.more') });
    await act(() => user.click(moreButton));

    const [deleteButton] = screen.getAllByRole('button', { name: textMock('general.delete') });
    await act(() => user.click(deleteButton));

    expect(mockHandleDeleteRule).toHaveBeenCalledTimes(1);
  });

  it('calls "setPolicyRules" when sub-resource fields are edited', async () => {
    const user = userEvent.setup();
    render(<ExpandablePolicyCard {...defaultProps} />);

    const [typeInput] = screen.getAllByLabelText(
      textMock('policy_editor.narrowing_list_field_type')
    );
    const [idInput] = screen.getAllByLabelText(textMock('policy_editor.narrowing_list_field_id'));

    const newWord: string = 'test';

    await act(() => user.type(typeInput, newWord));
    await act(() => user.type(idInput, newWord));

    expect(mockSetPolicyRules).toHaveBeenCalledTimes(newWord.length * 2);
  });

  it('displays the selected actions as Chips', async () => {
    const user = userEvent.setup();
    render(<ExpandablePolicyCard {...defaultProps} />);

    // Check that the selected actions are present
    const selectedAction1 = screen.getByLabelText(
      `${textMock('general.delete')} ${mockActionTitle1}`
    );
    const selectedAction2 = screen.getByLabelText(
      `${textMock('general.delete')} ${mockActionTitle2}`
    );
    const selectedAction3 = screen.queryByLabelText(
      `${textMock('general.delete')} ${mockActionTitle3}`
    );
    expect(selectedAction1).toBeInTheDocument();
    expect(selectedAction2).toBeInTheDocument();
    expect(selectedAction3).not.toBeInTheDocument(); // 3 is not in the resource

    // Open the select
    const [actionSelect] = screen.getAllByLabelText(
      textMock('policy_editor.rule_card_actions_select_add')
    );
    await act(() => user.click(actionSelect));

    // Check that the selected actions are not in the document
    const optionAction1 = screen.queryByRole('option', { name: mockActionTitle1 });
    const optionAction2 = screen.queryByRole('option', { name: mockActionTitle2 });
    const optionAction3 = screen.getByRole('option', { name: mockActionTitle3 });

    expect(optionAction1).not.toBeInTheDocument();
    expect(optionAction2).not.toBeInTheDocument();
    expect(optionAction3).toBeInTheDocument(); // 3 is in the resource

    // Click the final action
    await act(() => user.click(screen.getByRole('option', { name: mockActionTitle3 })));

    expect(mockSetPolicyRules).toHaveBeenCalledTimes(1);

    // Expect the option clicked to be removed from the screen
    expect(
      screen.queryByLabelText(`${textMock('general.delete')} ${mockActionTitle3}`)
    ).not.toBeInTheDocument();

    // Expect the label with all selected to be present
    const [inputAllSelected] = screen.getAllByLabelText(
      textMock('policy_editor.rule_card_actions_select_all_selected')
    );
    expect(inputAllSelected).toBeInTheDocument();
  });

  it('calls "setPolicyRules" when subjects are edited', async () => {
    const user = userEvent.setup();
    render(<ExpandablePolicyCard {...defaultProps} />);

    // Check that the selected subjects are present
    const selectedSubject1 = screen.getByLabelText(
      `${textMock('general.delete')} ${mockSubjectTitle1}`
    );
    const selectedSubject2 = screen.queryByLabelText(
      `${textMock('general.delete')} ${mockSubjectTitle2}`
    );
    const selectedSubject3 = screen.getByLabelText(
      `${textMock('general.delete')} ${mockSubjectTitle3}`
    );
    expect(selectedSubject1).toBeInTheDocument();
    expect(selectedSubject2).not.toBeInTheDocument(); // 2 is not in the resource
    expect(selectedSubject3).toBeInTheDocument();

    // Open the select
    const [subjectSelect] = screen.getAllByLabelText(
      textMock('policy_editor.rule_card_subjects_select_add')
    );
    await act(() => user.click(subjectSelect));

    // Check that the selected subjects are not in the document
    const optionSubject1 = screen.queryByRole('option', { name: mockSubjectTitle1 });
    const optionSubject2 = screen.getByRole('option', { name: mockSubjectTitle2 });
    const optionSubject3 = screen.queryByRole('option', { name: mockSubjectTitle3 });

    expect(optionSubject1).not.toBeInTheDocument();
    expect(optionSubject2).toBeInTheDocument(); // 2 is in the resource
    expect(optionSubject3).not.toBeInTheDocument();

    // Click the final subject
    await act(() => user.click(screen.getByRole('option', { name: mockSubjectTitle2 })));

    expect(mockSetPolicyRules).toHaveBeenCalledTimes(1);

    // Expect the option clicked to be removed from the screen
    expect(
      screen.queryByLabelText(`${textMock('general.delete')} ${mockSubjectTitle2}`)
    ).not.toBeInTheDocument();

    // Expect the label with all selected to be present
    const [inputAllSelected] = screen.getAllByLabelText(
      textMock('policy_editor.rule_card_subjects_select_all_selected')
    );
    expect(inputAllSelected).toBeInTheDocument();
  });

  it('calls "setPolicyRules" when description field is edited', async () => {
    const user = userEvent.setup();
    render(<ExpandablePolicyCard {...defaultProps} />);

    const [descriptionField] = screen.getAllByLabelText(
      textMock('policy_editor.rule_card_description_title')
    );
    expect(descriptionField).toHaveValue(mockPolicyRule1.description);
    await act(() => user.type(descriptionField, '1'));

    expect(mockSetPolicyRules).toHaveBeenCalledTimes(1);
  });

  it('calls "savePolicy" when input fields are blurred', async () => {
    const user = userEvent.setup();
    render(<ExpandablePolicyCard {...defaultProps} />);

    const [typeInput] = screen.getAllByLabelText(
      textMock('policy_editor.narrowing_list_field_type')
    );
    const [idInput] = screen.getAllByLabelText(textMock('policy_editor.narrowing_list_field_id'));

    const newWord: string = 'test';
    await act(() => user.type(typeInput, newWord));
    await act(() => user.tab());
    await act(() => user.type(idInput, newWord));
    await act(() => user.tab());

    const [actionSelect] = screen.getAllByLabelText(
      textMock('policy_editor.rule_card_actions_select_add')
    );
    await act(() => user.click(actionSelect));
    await act(() => user.click(screen.getByRole('option', { name: mockActionTitle3 })));
    await act(() => user.tab());

    const [subjectSelect] = screen.getAllByLabelText(
      textMock('policy_editor.rule_card_subjects_select_add')
    );
    await act(() => user.click(subjectSelect));
    await act(() => user.click(screen.getByRole('option', { name: mockSubjectTitle2 })));
    await act(() => user.tab());

    const [descriptionField] = screen.getAllByLabelText(
      textMock('policy_editor.rule_card_description_title')
    );
    expect(descriptionField).toHaveValue(mockPolicyRule1.description);
    await act(() => user.type(descriptionField, newWord));
    await act(() => user.tab());

    const numFields = 5;
    expect(mockSavePolicy).toHaveBeenCalledTimes(numFields);
  });
});
