import React, { useState } from 'react';
import classes from './PolicySubjects.module.css';
import { Chip } from '@digdir/designsystemet-react';
import type { PolicySubject } from '../../../../types';
import { findSubjectByPolicyRuleSubject } from '../../../../utils';
import { getSubjectOptions, getUpdatedRules } from '../../../../utils/PolicyRuleUtils';
import { useTranslation } from 'react-i18next';
import { usePolicyEditorContext } from '../../../../contexts/PolicyEditorContext';
import { usePolicyRuleContext } from '../../../../contexts/PolicyRuleContext';
import { StudioSelect } from '@studio/components';

export const PolicySubjects = (): React.ReactElement => {
  const { t } = useTranslation();
  const { policyRules, subjects, setPolicyRules, savePolicy } = usePolicyEditorContext();
  const { policyRule, uniqueId, showAllErrors, policyError, setPolicyError } =
    usePolicyRuleContext();

  const [subjectOptions, setSubjectOptions] = useState(getSubjectOptions(subjects, policyRule));

  const handleRemoveSubject = (index: number, subject: PolicySubject): void => {
    const updatedSubjects = [...policyRule.subject];
    updatedSubjects.splice(index, 1);

    setSubjectOptions((prevSubjectOptions) => [
      ...prevSubjectOptions,
      {
        value: subject.subjectId,
        label: subject.subjectTitle,
      },
    ]);

    const updatedRules = getUpdatedRules(
      { ...policyRule, subject: updatedSubjects },
      policyRule.ruleId,
      policyRules,
    );

    setPolicyRules(updatedRules);
    savePolicy(updatedRules);
    setPolicyError({
      ...policyError,
      subjectsError: policyRule.accessPackages.length === 0 && updatedSubjects.length === 0,
    });
  };

  const handleClickSubjectInList = (clickedOption: string) => {
    // Remove from options list
    const index = subjectOptions.findIndex((o) => o.value === clickedOption);
    const updatedOptions = [...subjectOptions];
    updatedOptions.splice(index, 1);
    setSubjectOptions(updatedOptions);

    const updatedSubjectTitles = [...policyRule.subject, clickedOption];
    const updatedRules = getUpdatedRules(
      { ...policyRule, subject: updatedSubjectTitles },
      policyRule.ruleId,
      policyRules,
    );
    setPolicyRules(updatedRules);
    savePolicy(updatedRules);
    setPolicyError({ ...policyError, subjectsError: false });
  };

  const displaySubjects = policyRule.subject.map((s, i) => {
    const subject: PolicySubject = findSubjectByPolicyRuleSubject(subjects, s);
    return (
      <Chip.Removable
        className={classes.chip}
        key={s}
        aria-label={`${t('general.delete')} ${subject.subjectTitle}`}
        size='small'
        onClick={() => handleRemoveSubject(i, subject)}
      >
        {subject.subjectTitle}
      </Chip.Removable>
    );
  });

  const description =
    subjectOptions.length === 0
      ? t('policy_editor.rule_card_subjects_select_all_selected')
      : t('policy_editor.rule_card_subjects_select_add');

  const error =
    showAllErrors && policyError.subjectsError
      ? t('policy_editor.rule_card_subjects_error')
      : false;

  return (
    <>
      <div className={classes.dropdownWrapper}>
        <StudioSelect
          description={description}
          label={t('policy_editor.rule_card_subjects_title')}
          onChange={(event) =>
            event.target.value !== null && handleClickSubjectInList(event.target.value)
          }
          disabled={subjectOptions.length === 0}
          error={error}
          id={`selectSubject-${uniqueId}`}
          defaultValue=''
        >
          <option hidden value=''></option>
          {subjectOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </StudioSelect>
      </div>
      <div className={classes.chipWrapper}>{displaySubjects}</div>
    </>
  );
};
