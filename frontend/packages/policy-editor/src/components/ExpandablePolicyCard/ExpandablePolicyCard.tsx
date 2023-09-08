import React, { useState } from 'react';
import { Button, TextArea, Label, ErrorMessage, Select } from '@digdir/design-system-react';
import { PlusIcon } from '@navikt/aksel-icons';
import classes from './ExpandablePolicyCard.module.css';
import { ActionAndSubjectListItem } from './ActionAndSubjectListItem';
import { ResourceNarrowingList } from './ResourceNarrowingList';
import { ExpandablePolicyElement } from './ExpandablePolicyElement';
import type {
  PolicyAction,
  PolicyRuleCard,
  PolicyRuleResource,
  PolicySubject,
  PolicyEditorUsage,
} from '../../types';
import { createNewPolicyResource } from '../../utils';
import {
  getActionOptions,
  getPolicyRuleIdString,
  getSubjectOptions,
  getUpdatedRules,
} from '../../utils/ExpandablePolicyCardUtils';
import { useTranslation } from 'react-i18next';

export type ExpandablePolicyCardProps = {
  /**
   * The rule to display in the card
   */
  policyRule: PolicyRuleCard;
  /**
   * The possible actions to select from
   */
  actions: PolicyAction[];
  /**
   * The possible subjects to select from
   */
  subjects: PolicySubject[];
  /**
   * The list of all the rules
   */
  rules: PolicyRuleCard[];
  /**
   * useState function to update the list of rules
   */
  setPolicyRules: React.Dispatch<React.SetStateAction<PolicyRuleCard[]>>;
  /**
   * The ID of the resource
   */
  resourceId: string;
  /**
   * The type of the resource
   */
  resourceType: string;
  /**
   * Function to be executed when clicking duplicate rule
   * @returns void
   */
  handleCloneRule: () => void;
  /**
   * Function to be executed when clicking delete rule
   * @returns void
   */
  handleDeleteRule: () => void;
  /**
   * Flag to decide if errors should be shown or not
   */
  showErrors: boolean;
  /**
   * Function to save the policy
   * @returns
   */
  savePolicy: (rules: PolicyRuleCard[]) => void;
  /**
   * The usage type of the policy editor
   */
  usageType: PolicyEditorUsage;
};

/**
 * @component
 *    Component that displays a card where a user can view and update a policy rule
 *    for a resource.
 *
 * @property {PolicyRuleCard}[policyRule] - The rule to display in the card
 * @property {PolicyAction[]}[actions] - The possible actions to select from
 * @property {PolicySubject[]}[subjects] - The possible subjects to select from
 * @property {PolicyRuleCard[]}[rules] - The list of all the rules
 * @property {React.Dispatch<React.SetStateAction<PolicyRuleCard[]>>}[setPolicyRules] - useState function to update the list of rules
 * @property {string}[resourceId] - The ID of the resource
 * @property {string}[resourceType] - The type of the resource
 * @property {function}[handleCloneRule] - Function to be executed when clicking clone rule
 * @property {function}[handleDeleteRule] - Function to be executed when clicking delete rule
 * @property {boolean}[showErrors] - Flag to decide if errors should be shown or not
 * @property {function}[savePolicy] - Function to save the policy
 * @property {PolicyEditorUsage}[usageType] - The usage type of the policy editor
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const ExpandablePolicyCard = ({
  policyRule,
  actions,
  subjects,
  rules,
  setPolicyRules,
  resourceId,
  resourceType,
  handleCloneRule,
  handleDeleteRule,
  showErrors,
  savePolicy,
  usageType,
}: ExpandablePolicyCardProps): React.ReactNode => {
  const { t } = useTranslation();

  const [hasResourceError, setHasResourceError] = useState(policyRule.resources.length === 0);
  const [hasRightsError, setHasRightsErrors] = useState(policyRule.actions.length === 0);
  const [hasSubjectsError, setHasSubjectsError] = useState(policyRule.subject.length === 0);
  const [subjectOptions, setSubjectOptions] = useState(getSubjectOptions(subjects, policyRule));
  const [actionOptions, setActionOptions] = useState(getActionOptions(actions, policyRule));

  /**
   * Handles the changes in the input fields inside the resource blocks
   *
   * @param index the index of the element in the resource block
   * @param field the type of textfield to update
   * @param value the value types in the textfield
   * @param ruleIndex the index of the rule
   */
  const handleInputChange = (
    index: number,
    field: 'id' | 'type',
    value: string,
    ruleIndex: number
  ) => {
    const updatedResources = [...policyRule.resources];
    updatedResources[ruleIndex][index] = {
      ...updatedResources[ruleIndex][index],
      [field]: value,
    };

    const updatedRules = getUpdatedRules(
      { ...policyRule, resources: updatedResources },
      policyRule.ruleId,
      rules
    );
    setPolicyRules(updatedRules);
  };

  /**
   * Adds a resource block to the list of resources. The first element in the
   * resource block is set to the resource's ID and type.
   */
  const handleClickAddResource = () => {
    const newResource: PolicyRuleResource[] = createNewPolicyResource(
      usageType,
      resourceType,
      resourceId
    );

    const updatedResources = [...policyRule.resources, newResource];
    const updatedRules = getUpdatedRules(
      { ...policyRule, resources: updatedResources },
      policyRule.ruleId,
      rules
    );
    setPolicyRules(updatedRules);
    savePolicy(updatedRules);
    setHasResourceError(false);
  };

  /**
   * Displays a list of resource blocks, which each contains a list of the resources
   * and the list narrowing down the elements.
   */
  const displayResources = policyRule.resources.map((r, i) => {
    return (
      <ResourceNarrowingList
        key={policyRule.ruleId + '-' + i}
        resources={r}
        handleInputChange={(narrowResourceIndex, field, s) =>
          handleInputChange(narrowResourceIndex, field, s, i)
        }
        handleRemoveResource={(narrowResourceIndex) =>
          handleRemoveNarrowingResource(narrowResourceIndex, i)
        }
        handleClickAddResource={() => handleClickAddResourceNarrowing(i)}
        handleCloneElement={() => handleCloneResourceGroup(i)}
        handleRemoveElement={() => handleDeleteResourceGroup(i)}
        onBlur={() => savePolicy(rules)}
        usageType={usageType}
      />
    );
  });

  /**
   * Handles the addition of more resources
   */
  const handleClickAddResourceNarrowing = (resourceIndex: number) => {
    const newResource: PolicyRuleResource = {
      type: '',
      id: '',
    };
    const updatedResources = [...policyRule.resources];
    updatedResources[resourceIndex].push(newResource);

    const updatedRules = getUpdatedRules(
      { ...policyRule, resources: updatedResources },
      policyRule.ruleId,
      rules
    );
    setPolicyRules(updatedRules);
    savePolicy(updatedRules);
  };

  /**
   * Handles the removal of the narrowed resources
   */
  const handleRemoveNarrowingResource = (index: number, ruleIndex: number) => {
    const updatedResources = [...policyRule.resources];
    updatedResources[ruleIndex].splice(index, 1);
    const updatedRules = getUpdatedRules(
      { ...policyRule, resources: updatedResources },
      policyRule.ruleId,
      rules
    );
    setPolicyRules(updatedRules);
    savePolicy(updatedRules);
  };

  /**
   * Displays the actions
   */
  const displayActions = policyRule.actions.map((a, i) => {
    return <ActionAndSubjectListItem key={i} title={a} onRemove={() => handleRemoveAction(i, a)} />;
  });

  /**
   * Handles the removal of actions
   */
  const handleRemoveAction = (index: number, actionTitle: string) => {
    // Remove from selected list
    const updatedActions = [...policyRule.actions];
    updatedActions.splice(index, 1);

    // Add to options list
    setActionOptions([...actionOptions, { value: actionTitle, label: actionTitle }]);

    const updatedRules = getUpdatedRules(
      { ...policyRule, actions: updatedActions },
      policyRule.ruleId,
      rules
    );
    setPolicyRules(updatedRules);
    savePolicy(updatedRules);
    setHasRightsErrors(updatedActions.length === 0);
  };

  /**
   * Displays the selected subjects
   */
  const displaySubjects = policyRule.subject.map((s, i) => {
    return (
      <ActionAndSubjectListItem key={i} title={s} onRemove={() => handleRemoveSubject(i, s)} />
    );
  });

  /**
   * Handles the removal of subjects
   */
  const handleRemoveSubject = (index: number, subjectTitle: string) => {
    // Remove from selected list
    const updatedSubjects = [...policyRule.subject];
    updatedSubjects.splice(index, 1);

    // Add to options list
    setSubjectOptions([...subjectOptions, { value: subjectTitle, label: subjectTitle }]);
    const updatedRules = getUpdatedRules(
      { ...policyRule, subject: updatedSubjects },
      policyRule.ruleId,
      rules
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
      rules
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
      rules
    );
    setPolicyRules(updatedRules);
    savePolicy(updatedRules);
    setHasRightsErrors(false);
  };

  /**
   * Updates the description of the rule
   */
  const handleChangeDescription = (description: string) => {
    const updatedRules = getUpdatedRules({ ...policyRule, description }, policyRule.ruleId, rules);
    setPolicyRules(updatedRules);
  };

  /**
   * Duplicates a resource group and all the content in it.
   *
   * @param resourceIndex the index of the resource group to duplicate
   */
  const handleCloneResourceGroup = (resourceIndex: number) => {
    const resourceGroupToDuplicate: PolicyRuleResource[] = policyRule.resources[resourceIndex];

    // Create a deep copy of the object so the objects don't share same object reference
    const deepCopiedResourceGroupToDuplicate: PolicyRuleResource[] = JSON.parse(
      JSON.stringify(resourceGroupToDuplicate)
    );

    const updatedResources = [...policyRule.resources, deepCopiedResourceGroupToDuplicate];
    const updatedRules = getUpdatedRules(
      { ...policyRule, resources: updatedResources },
      policyRule.ruleId,
      rules
    );
    setPolicyRules(updatedRules);
    savePolicy(updatedRules);
  };

  /**
   * Removes a resource group and all the content in it.
   *
   * @param resourceIndex the index of the resource group to remove
   */
  const handleDeleteResourceGroup = (resourceIndex: number) => {
    const updatedResources = [...policyRule.resources];
    updatedResources.splice(resourceIndex, 1);
    const updatedRules = getUpdatedRules(
      { ...policyRule, resources: updatedResources },
      policyRule.ruleId,
      rules
    );
    setPolicyRules(updatedRules);
    savePolicy(updatedRules);
    setHasResourceError(updatedResources.length === 0);
  };

  /**
   * Displays the given text in a warning card
   *
   * @param text the text to display
   */
  const displayWarningCard = (text: string) => {
    return (
      <div className={classes.warningCardWrapper}>
        <ErrorMessage as='p' size='small'>
          {text}
        </ErrorMessage>
      </div>
    );
  };

  /**
   * Gets if there is an error in the rule card
   */
  const getHasRuleError = () => {
    return hasResourceError || hasRightsError || hasSubjectsError;
  };

  /**
   * Gets the correct text to display for a rule with missing values
   */
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
    <div className={classes.cardWrapper}>
      <ExpandablePolicyElement
        title={`${t('policy_editor.rule')} ${getPolicyRuleIdString(policyRule)}`}
        isCard
        handleCloneElement={handleCloneRule}
        handleRemoveElement={handleDeleteRule}
        hasError={showErrors && getHasRuleError()}
      >
        <Label as='p' className={classes.label} size='medium'>
          {t('policy_editor.rule_card_sub_resource_title')}
        </Label>
        {displayResources}
        <div className={classes.addResourceButton}>
          <Button
            type='button'
            onClick={handleClickAddResource}
            color='secondary'
            size='small'
            fullWidth
            icon={
              <PlusIcon
                title={t('policy_editor.rule_card_sub_resource_button')}
                fontSize='1.5rem'
              />
            }
          >
            {t('policy_editor.rule_card_sub_resource_button')}
          </Button>
        </div>
        {showErrors &&
          hasResourceError &&
          displayWarningCard(t('policy_editor.rule_card_sub_resource_error'))}
        <Label as='p' className={classes.label} size='medium'>
          {t('policy_editor.rule_card_actions_title')}
        </Label>
        <div className={classes.dropdownWrapper}>
          <Select
            options={actionOptions}
            onChange={(value: string) => value !== null && handleClickActionInList(value)}
            disabled={actionOptions.length === 0}
            label={
              actionOptions.length === 0
                ? t('policy_editor.rule_card_actions_select_all_selected')
                : t('policy_editor.rule_card_actions_select_add')
            }
            error={showErrors && hasRightsError}
          />
        </div>
        <div className={classes.chipWrapper}>{displayActions}</div>
        {showErrors &&
          hasRightsError &&
          displayWarningCard(t('policy_editor.rule_card_actions_error'))}
        <Label as='p' className={classes.label} size='medium'>
          {t('policy_editor.rule_card_subjects_title')}
        </Label>
        <div className={classes.dropdownWrapper}>
          <Select
            options={subjectOptions}
            onChange={(value: string) => value !== null && handleClickSubjectInList(value)}
            disabled={subjectOptions.length === 0}
            label={
              subjectOptions.length === 0
                ? t('policy_editor.rule_card_subjects_select_all_selected')
                : t('policy_editor.rule_card_subjects_select_add')
            }
            error={showErrors && hasSubjectsError}
          />
        </div>
        <div className={classes.chipWrapper}>{displaySubjects}</div>
        {showErrors &&
          hasSubjectsError &&
          displayWarningCard(t('policy_editor.rule_card_subjects_error'))}
        <Label as='p' className={classes.label} size='medium'>
          {t('policy_editor.rule_card_description_title')}
        </Label>
        <div className={classes.textAreaWrapper}>
          <TextArea
            resize='vertical'
            value={policyRule.description}
            onChange={(e) => handleChangeDescription(e.currentTarget.value)}
            rows={5}
            aria-label='ruleDescription'
            onBlur={() => savePolicy(rules)}
          />
        </div>
      </ExpandablePolicyElement>
      {showErrors && displayWarningCard(getRuleErrorText())}
    </div>
  );
};
