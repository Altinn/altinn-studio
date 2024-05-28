import React, { useState, useId } from 'react';
import {
  Label,
  ErrorMessage,
  Paragraph,
  Textarea,
  LegacySelect,
} from '@digdir/design-system-react';
import classes from './PolicyRule.module.css';
import { ActionAndSubjectListItem } from './ActionAndSubjectListItem';
import { ExpandablePolicyElement } from './ExpandablePolicyElement';
import type { PolicyRuleCard, PolicySubject } from '../../../types';
import { findSubjectByPolicyRuleSubject } from '../../../utils';
import {
  getActionOptions,
  getPolicyRuleIdString,
  getSubjectOptions,
  getUpdatedRules,
} from '../../../utils/PolicyRuleUtils';
import { useTranslation } from 'react-i18next';
import { usePolicyEditorContext } from '../../../contexts/PolicyEditorContext';
import { SubResources } from './SubResources';
import { PolicyRuleContextProvider } from '../../../contexts/PolicyRuleContext';

const wellKnownActionsIds: string[] = [
  'complete',
  'confirm',
  'delete',
  'instantiate',
  'read',
  'sign',
  'write',
];

export type PolicyRuleProps = {
  policyRule: PolicyRuleCard;
  handleCloneRule: () => void;
  handleDeleteRule: () => void;
  showErrors: boolean;
};

export const PolicyRule = ({
  policyRule,
  handleCloneRule,
  handleDeleteRule,
  showErrors,
}: PolicyRuleProps): React.ReactNode => {
  const { t } = useTranslation();

  // FIX BELOW
  const {
    policyRules: rules,
    setPolicyRules,
    actions,
    subjects,
    savePolicy,
  } = usePolicyEditorContext();

  const uniqueId = useId();

  const [hasResourceError, setHasResourceError] = useState(policyRule.resources.length === 0);

  const [hasRightsError, setHasRightsErrors] = useState(policyRule.actions.length === 0);
  const [hasSubjectsError, setHasSubjectsError] = useState(policyRule.subject.length === 0);

  const [subjectOptions, setSubjectOptions] = useState(getSubjectOptions(subjects, policyRule));
  const [actionOptions, setActionOptions] = useState(getActionOptions(actions, policyRule));

  const getTranslationByActionId = (actionId: string): string => {
    return wellKnownActionsIds.includes(actionId)
      ? t(`policy_editor.action_${actionId}`)
      : actionId;
  };

  const displayActions = policyRule.actions.map((actionId, i) => {
    return (
      <ActionAndSubjectListItem
        key={actionId}
        title={getTranslationByActionId(actionId)}
        onRemove={() => handleRemoveAction(i, actionId)}
      />
    );
  });

  const handleRemoveAction = (index: number, actionTitle: string) => {
    const updatedActions = [...policyRule.actions];
    updatedActions.splice(index, 1);

    setActionOptions([...actionOptions, { value: actionTitle, label: actionTitle }]);

    const updatedRules = getUpdatedRules(
      { ...policyRule, actions: updatedActions },
      policyRule.ruleId,
      rules,
    );
    setPolicyRules(updatedRules);
    savePolicy(updatedRules);
    setHasRightsErrors(updatedActions.length === 0);
  };

  const displaySubjects = policyRule.subject.map((s, i) => {
    const subject: PolicySubject = findSubjectByPolicyRuleSubject(subjects, s);
    return (
      <ActionAndSubjectListItem
        key={i}
        title={subject.subjectTitle}
        onRemove={() => handleRemoveSubject(i, subject)}
      />
    );
  });

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
      rules,
    );

    setPolicyRules(updatedRules);
    savePolicy(updatedRules);
    setHasSubjectsError(updatedSubjects.length === 0);
  };

  /**
   * Handles the click on a subject in the select list. It removes the clicked element
   * from the options list, and adds it to the selected subject title list.
   */
  const handleClickSubjectInList = (option: string) => {
    // As the input field is multiple, the onchance function uses string[], but
    // we are removing the element from the options list before it is displayed, so
    // it will only ever be a first value in the array.
    const clickedOption = option;

    // Remove from options list
    const index = subjectOptions.findIndex((o) => o.value === clickedOption);
    const updatedOptions = [...subjectOptions];
    updatedOptions.splice(index, 1);
    setSubjectOptions(updatedOptions);

    const updatedSubjectTitles = [...policyRule.subject, clickedOption];
    const updatedRules = getUpdatedRules(
      { ...policyRule, subject: updatedSubjectTitles },
      policyRule.ruleId,
      rules,
    );
    setPolicyRules(updatedRules);
    savePolicy(updatedRules);
    setHasSubjectsError(false);
  };

  /**
   * Handles the click on an action in the select list. It removes the clicked element
   * from the options list, and adds it to the selected action title list.
   */
  const handleClickActionInList = (option: string) => {
    // As the input field is multiple, the onChange function uses string[], but
    // we are removing the element from the options list before it is displayed, so
    // it will only ever be a first value in the array.
    const clickedOption = option;

    // Remove from options list
    const index = actionOptions.findIndex((o) => o.value === clickedOption);
    const updatedOptions = [...actionOptions];
    updatedOptions.splice(index, 1);
    setActionOptions(updatedOptions);

    const updatedActionTitles = [...policyRule.actions, clickedOption];
    const updatedRules = getUpdatedRules(
      { ...policyRule, actions: updatedActionTitles },
      policyRule.ruleId,
      rules,
    );
    setPolicyRules(updatedRules);
    savePolicy(updatedRules);
    setHasRightsErrors(false);
  };

  const handleChangeDescription = (description: string) => {
    const updatedRules = getUpdatedRules({ ...policyRule, description }, policyRule.ruleId, rules);
    setPolicyRules(updatedRules);
  };

  // TODO - FIX
  const displayError = (text: string) => {
    return <ErrorMessage size='small'>{text}</ErrorMessage>;
  };

  const getHasRuleError = () => {
    return hasResourceError || hasRightsError || hasSubjectsError;
  };

  const getRuleErrorText = (): string => {
    const arr: string[] = [];
    if (hasResourceError) arr.push(t('policy_editor.policy_rule_missing_sub_resource'));
    if (hasRightsError) arr.push(t('policy_editor.policy_rule_missing_actions'));
    if (hasSubjectsError) arr.push(t('policy_editor.policy_rule_missing_subjects'));

    if (arr.length === 1) {
      return t('policy_editor.policy_rule_missing_1', {
        ruleId: policyRule.ruleId,
        missing: arr[0],
      });
    }
    if (arr.length === 2) {
      return t('policy_editor.policy_rule_missing_2', {
        ruleId: policyRule.ruleId,
        missing1: arr[0],
        missing2: arr[1],
      });
    }
    if (arr.length === 3) {
      return t('policy_editor.policy_rule_missing_3', {
        ruleId: policyRule.ruleId,
        missing1: arr[0],
        missing2: arr[1],
        missing3: arr[2],
      });
    }
    return '';
  };

  return (
    <PolicyRuleContextProvider
      policyRule={policyRule}
      showAllErrors={showErrors}
      hasResourceError={hasResourceError}
      setHasResourceError={setHasResourceError}
    >
      <div className={classes.cardWrapper}>
        <ExpandablePolicyElement
          title={`${t('policy_editor.rule')} ${getPolicyRuleIdString(policyRule)}`}
          isCard
          handleCloneElement={handleCloneRule}
          handleRemoveElement={handleDeleteRule}
          hasError={showErrors && getHasRuleError()}
        >
          <SubResources />
          <Label className={classes.label} size='small' htmlFor={`selectAction-${uniqueId}`}>
            {t('policy_editor.rule_card_actions_title')}
          </Label>
          <Paragraph size='small' className={classes.inputParagraph}>
            {actionOptions.length === 0
              ? t('policy_editor.rule_card_actions_select_all_selected')
              : t('policy_editor.rule_card_actions_select_add')}
          </Paragraph>
          <div className={classes.dropdownWrapper}>
            <LegacySelect
              options={actionOptions.map((option) => ({
                ...option,
                label: getTranslationByActionId(option.label),
              }))}
              onChange={(value: string) => value !== null && handleClickActionInList(value)}
              disabled={actionOptions.length === 0}
              error={showErrors && hasRightsError}
              inputId={`selectAction-${uniqueId}`}
            />
          </div>
          <div className={classes.chipWrapper}>{displayActions}</div>
          {showErrors && hasRightsError && displayError(t('policy_editor.rule_card_actions_error'))}
          <Label className={classes.label} size='small' htmlFor={`selectSubject-${uniqueId}`}>
            {t('policy_editor.rule_card_subjects_title')}
          </Label>
          <Paragraph size='small' className={classes.inputParagraph}>
            {subjectOptions.length === 0
              ? t('policy_editor.rule_card_subjects_select_all_selected')
              : t('policy_editor.rule_card_subjects_select_add')}
          </Paragraph>
          <div className={classes.dropdownWrapper}>
            <LegacySelect
              options={subjectOptions}
              onChange={(value: string) => value !== null && handleClickSubjectInList(value)}
              disabled={subjectOptions.length === 0}
              error={showErrors && hasSubjectsError}
              inputId={`selectSubject-${uniqueId}`}
            />
          </div>
          <div className={classes.chipWrapper}>{displaySubjects}</div>
          {showErrors &&
            hasSubjectsError &&
            displayError(t('policy_editor.rule_card_subjects_error'))}
          <div className={classes.textAreaWrapper}>
            <Textarea
              label={t('policy_editor.rule_card_description_title')}
              size='small'
              value={policyRule.description}
              onChange={(e) => handleChangeDescription(e.currentTarget.value)}
              rows={5}
              onBlur={() => savePolicy(rules)}
              id={`description-${uniqueId}`}
              className={classes.descriptionInput}
            />
          </div>
        </ExpandablePolicyElement>
        {showErrors && displayError(getRuleErrorText())}
      </div>
    </PolicyRuleContextProvider>
  );
};
