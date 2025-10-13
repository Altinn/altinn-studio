import React, { useState } from 'react';
import classes from './PolicySubjects.module.css';
import { Label, ErrorMessage, Paragraph, Chip } from '@digdir/designsystemet-react';
import type { PolicySubject } from '../../../../types';
import { findSubjectByPolicyRuleSubject } from '../../../../utils';
import { getSubjectOptions, getUpdatedRules } from '../../../../utils/PolicyRuleUtils';
import { useTranslation } from 'react-i18next';
import { usePolicyEditorContext } from '../../../../contexts/PolicyEditorContext';
import { usePolicyRuleContext } from '../../../../contexts/PolicyRuleContext';
import { StudioNativeSelect } from '@studio/components-legacy';

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
      subjectsError: updatedSubjects.length === 0 && policyRule.accessPackages.length === 0,
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

  return (
    <>
      <Label className={classes.label} size='small' htmlFor={`selectSubject-${uniqueId}`}>
        {t('policy_editor.rule_card_subjects_title')}
      </Label>
      <Paragraph size='small' className={classes.inputParagraph}>
        {subjectOptions.length === 0
          ? t('policy_editor.rule_card_subjects_select_all_selected')
          : t('policy_editor.rule_card_subjects_select_add')}
      </Paragraph>
      <div className={classes.dropdownWrapper}>
        <StudioNativeSelect
          onChange={(event) =>
            event.target.value !== null && handleClickSubjectInList(event.target.value)
          }
          disabled={subjectOptions.length === 0}
          error={showAllErrors && policyError.subjectsError}
          id={`selectSubject-${uniqueId}`}
          size='sm'
          defaultValue=''
        >
          <option hidden value=''></option>
          {subjectOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </StudioNativeSelect>
      </div>
      <div className={classes.chipWrapper}>{displaySubjects}</div>
      {showAllErrors && policyError.subjectsError && (
        <ErrorMessage size='small'>{t('policy_editor.rule_card_subjects_error')}</ErrorMessage>
      )}
    </>
  );
};
