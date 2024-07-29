import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PolicySubjects } from './PolicySubjects';
import { textMock } from '@studio/testing/mocks/i18nMock';
import {
  mockSubjectTitle1,
  mockSubjectTitle2,
  mockSubjectTitle3,
} from '../../../../../test/mocks/policySubjectMocks';
import { PolicyEditorContext } from '../../../../contexts/PolicyEditorContext';
import { PolicyRuleContext } from '../../../../contexts/PolicyRuleContext';
import { mockPolicyEditorContextValue } from '../../../../../test/mocks/policyEditorContextMock';
import { mockPolicyRuleContextValue } from '../../../../../test/mocks/policyRuleContextMock';

describe('PolicySubjects', () => {
  afterEach(jest.clearAllMocks);

  it('calls "setPolicyRules" when subjects are edited', async () => {
    const user = userEvent.setup();
    renderPolicySubjects();

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

    await user.selectOptions(subjectSelect, mockSubjectTitle2);

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
    renderPolicySubjects();

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

  it('calls the "setPolicyRules", "savePolicy", and "setPolicyError" function when the chip is clicked', async () => {
    const user = userEvent.setup();
    renderPolicySubjects();

    await user.selectOptions(
      screen.getByLabelText(textMock('policy_editor.rule_card_subjects_title')),
      mockSubjectTitle2,
    );

    expect(mockPolicyEditorContextValue.setPolicyRules).toHaveBeenCalledTimes(1);
    expect(mockPolicyEditorContextValue.savePolicy).toHaveBeenCalledTimes(1);
    expect(mockPolicyRuleContextValue.setPolicyError).toHaveBeenCalledTimes(1);
  });
});

const renderPolicySubjects = () => {
  return render(
    <PolicyEditorContext.Provider value={mockPolicyEditorContextValue}>
      <PolicyRuleContext.Provider value={mockPolicyRuleContextValue}>
        <PolicySubjects />
      </PolicyRuleContext.Provider>
    </PolicyEditorContext.Provider>,
  );
};
