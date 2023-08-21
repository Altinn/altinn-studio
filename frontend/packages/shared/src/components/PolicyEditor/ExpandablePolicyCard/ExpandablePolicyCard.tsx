import React, { useState } from 'react';
import { Button, TextArea, Label, ErrorMessage, Select } from '@digdir/design-system-react';
import { PlusIcon } from '@navikt/aksel-icons';
import classes from './ExpandablePolicyCard.module.css';
import { ActionAndSubjectListItem } from './ActionAndSubjectListItem';
import { ResourceNarrowingList } from './ResourceNarrowingList';
import { ExpandablePolicyElement } from './ExpandablePolicyElement';
import { ScreenReaderSpan } from 'resourceadm/components/ScreenReaderSpan';
import {
  PolicyActionType,
  PolicyRuleCardType,
  PolicyRuleResourceType,
  PolicySubjectType,
} from 'app-shared/types/PolicyEditorTypes';

interface Props {
  /**
   * The rule to display in the card
   */
  policyRule: PolicyRuleCardType;
  /**
   * The possible actions to select from
   */
  actions: PolicyActionType[];
  /**
   * The possible subjects to select from
   */
  subjects: PolicySubjectType[];
  /**
   * The list of all the rules
   */
  rules: PolicyRuleCardType[];
  /**
   * useState function to update the list of rules
   */
  setPolicyRules: React.Dispatch<React.SetStateAction<PolicyRuleCardType[]>>;
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
  handleDuplicateRule: () => void;
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
  savePolicy: (rules: PolicyRuleCardType[]) => void;
}

/**
 * @component
 *    Component that displays a card where a user can view and update a policy rule
 *    for a resource.
 *
 * @property {PolicyRuleCardType}[policyRule] - The rule to display in the card
 * @property {PolicyActionType[]}[actions] - The possible actions to select from
 * @property {PolicySubjectType[]}[subjects] - The possible subjects to select from
 * @property {PolicyRuleCardType[]}[rules] - The list of all the rules
 * @property {React.Dispatch<React.SetStateAction<PolicyRuleCardType[]>>}[setPolicyRules] - useState function to update the list of rules
 * @property {string}[resourceId] - The ID of the resource
 * @property {string}[resourceType] - The type of the resource
 * @property {function}[handleDuplicateRule] - Function to be executed when clicking duplicate rule
 * @property {function}[handleDeleteRule] - Function to be executed when clicking delete rule
 * @property {boolean}[showErrors] - Flag to decide if errors should be shown or not
 * @property {function}[onBlur] - Function to save the policy
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
  handleDuplicateRule,
  handleDeleteRule,
  showErrors,
  savePolicy,
}: Props): React.ReactNode => {
  const [hasResourceError, setHasResourceError] = useState(policyRule.resources.length === 0);
  const [hasRightsError, setHasRightsErrors] = useState(policyRule.actions.length === 0);
  const [hasSubjectsError, setHasSubjectsError] = useState(policyRule.subject.length === 0);

  /**
   * Function to update the fields inside the rule object in the rule array.
   * This function has to be called every time an element inside the card is
   * changing so that the parent component knows that the child element is changed.
   * It also updates the complete list of policy rules.
   *
   * @param d the description
   * @param s the selected subjectTitle array
   * @param a the selected actions array
   * @param r the selected resources array
   * @param saveOnUpdate flag to decide if the policy should be saved on update
   */
  const updateRules = (
    d: string,
    s: string[],
    a: string[],
    r: PolicyRuleResourceType[][],
    saveOnUpdate: boolean
  ) => {
    const updatedRules = [...rules];
    const ruleIndex = rules.findIndex((rule) => rule.ruleId === policyRule.ruleId);

    updatedRules[ruleIndex] = {
      ...updatedRules[ruleIndex],
      description: d,
      subject: s,
      actions: a,
      resources: r,
    };

    setPolicyRules(updatedRules);
    saveOnUpdate && savePolicy(updatedRules);
  };

  /**
   * Maps the subject objects to option objects for display in the select component
   */
  const getSubjectOptions = () => {
    return subjects
      .filter((s) => !policyRule.subject.includes(s.subjectTitle))
      .map((s) => ({ value: s.subjectTitle, label: s.subjectTitle }));
  };
  const [subjectOptions, setSubjectOptions] = useState(getSubjectOptions());

  /**
   * Maps the action objects to option objects for display in the select component
   */
  const getActionOptions = () => {
    return actions
      .filter((a) => !policyRule.actions.includes(a.actionTitle))
      .map((a) => ({ value: a.actionTitle, label: a.actionTitle }));
  };
  const [actionOptions, setActionOptions] = useState(getActionOptions());

  /**
   * Gets the id of the policy
   */
  const getPolicyRuleId = () => {
    return policyRule.ruleId.toString();
  };

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
    updateRules(
      policyRule.description,
      policyRule.subject,
      policyRule.actions,
      updatedResources,
      false
    );
  };

  /**
   * Adds a resource block to the list of resources. The first element in the
   * resource block is set to the resource's ID and type.
   */
  const handleClickAddResource = () => {
    const newResource: PolicyRuleResourceType[] = [
      {
        type: resourceType,
        id: resourceId,
      },
    ];
    const updatedResources = [...policyRule.resources, newResource];
    updateRules(
      policyRule.description,
      policyRule.subject,
      policyRule.actions,
      updatedResources,
      true
    );

    setHasResourceError(false);
  };

  /**
   * Displays a list of resource blocks, which each contains a list of the resources
   * and the list narrowing down the elements.
   */
  const displayResources = policyRule.resources.map((r, i) => {
    return (
      <ResourceNarrowingList
        key={i}
        resources={r}
        handleInputChange={(narrowResourceIndex, field, s) =>
          handleInputChange(narrowResourceIndex, field, s, i)
        }
        handleRemoveResource={(narrowResourceIndex) =>
          handleRemoveNarrowingResource(narrowResourceIndex, i)
        }
        handleClickAddResource={() => handleClickAddResourceNarrowing(i)}
        handleDuplicateElement={() => handleDuplicateResourceGroup(i)}
        handleRemoveElement={() => handleDeleteResourceGroup(i)}
        onBlur={() => savePolicy(rules)}
      />
    );
  });

  /**
   * Handles the addition of more resources
   */
  const handleClickAddResourceNarrowing = (resourceIndex: number) => {
    const newResource: PolicyRuleResourceType = {
      type: '',
      id: '',
    };
    const updatedResources = [...policyRule.resources];
    updatedResources[resourceIndex].push(newResource);

    updateRules(
      policyRule.description,
      policyRule.subject,
      policyRule.actions,
      updatedResources,
      true
    );
  };

  /**
   * Handles the removal of the narrowed resources
   */
  const handleRemoveNarrowingResource = (index: number, ruleIndex: number) => {
    const updatedResources = [...policyRule.resources];
    updatedResources[ruleIndex].splice(index, 1);
    updateRules(
      policyRule.description,
      policyRule.subject,
      policyRule.actions,
      updatedResources,
      true
    );
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

    updateRules(
      policyRule.description,
      policyRule.subject,
      updatedActions,
      policyRule.resources,
      true
    );

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

    updateRules(
      policyRule.description,
      updatedSubjects,
      policyRule.actions,
      policyRule.resources,
      true
    );

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

    updateRules(
      policyRule.description,
      updatedSubjectTitles,
      policyRule.actions,
      policyRule.resources,
      true
    );

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

    updateRules(
      policyRule.description,
      policyRule.subject,
      updatedActionTitles,
      policyRule.resources,
      true
    );

    setHasRightsErrors(false);
  };

  /**
   * Updates the description of the rule
   */
  const handleChangeDescription = (description: string) => {
    updateRules(description, policyRule.subject, policyRule.actions, policyRule.resources, false);
  };

  /**
   * Duplicates a resource group and all the content in it.
   *
   * @param resourceIndex the index of the resource group to duplicate
   */
  const handleDuplicateResourceGroup = (resourceIndex: number) => {
    const resourceGroupToDuplicate: PolicyRuleResourceType[] = policyRule.resources[resourceIndex];

    // Create a deep copy of the object so the objects don't share same object reference
    const deepCopiedResourceGroupToDuplicate: PolicyRuleResourceType[] = JSON.parse(
      JSON.stringify(resourceGroupToDuplicate)
    );

    const updatedResources = [...policyRule.resources, deepCopiedResourceGroupToDuplicate];
    updateRules(
      policyRule.description,
      policyRule.subject,
      policyRule.actions,
      updatedResources,
      true
    );
  };

  /**
   * Removes a resource group and all the content in it.
   *
   * @param resourceIndex the index of the resource group to remove
   */
  const handleDeleteResourceGroup = (resourceIndex: number) => {
    const updatedResources = [...policyRule.resources];
    updatedResources.splice(resourceIndex, 1);
    updateRules(
      policyRule.description,
      policyRule.subject,
      policyRule.actions,
      updatedResources,
      true
    );

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
        <ErrorMessage size='small'>{text}</ErrorMessage>
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
    if (hasResourceError) arr.push('sub-ressurs');
    if (hasRightsError) arr.push('rettigheter');
    if (hasSubjectsError) arr.push('roller');

    if (arr.length === 1) {
      return `Regel ${policyRule.ruleId} mangler ${arr[0]}`;
    }
    if (arr.length === 2) {
      return `Regel ${policyRule.ruleId} mangler ${arr[0]} og ${arr[1]}`;
    }
    if (arr.length === 3) {
      return `Regel ${policyRule.ruleId} mangler ${arr[0]}, ${arr[1]} og ${arr[2]}`;
    }
    return '';
  };

  return (
    <div className={classes.cardWrapper}>
      <ExpandablePolicyElement
        title={`Regel ${getPolicyRuleId()}`}
        isCard
        handleDuplicateElement={handleDuplicateRule}
        handleRemoveElement={handleDeleteRule}
        hasError={showErrors && getHasRuleError()}
      >
        <Label className={classes.label} size='medium'>
          Hvilken sub-ressurser skal regelen gjelde for?
        </Label>
        {displayResources}
        <div className={classes.addResourceButton}>
          <Button
            type='button'
            onClick={handleClickAddResource}
            color='secondary'
            fullWidth
            icon={<PlusIcon title='Legg til en innsnevring av sub-ressursen' fontSize='1.5rem' />}
          >
            Legg til en sub-ressurs
          </Button>
        </div>
        {showErrors &&
          hasResourceError &&
          displayWarningCard('Du må legge til minimum en sub-ressurs.')}
        <Label className={classes.label} size='medium'>
          Hvilke rettigheter skal gis?
        </Label>
        <div className={classes.dropdownWrapper}>
          <Select
            options={actionOptions}
            onChange={(value: string) => value !== null && handleClickActionInList(value)}
            disabled={actionOptions.length === 0}
            label={actionOptions.length === 0 ? 'Alle rettigheter er valgt' : 'Legg til rettighet'}
            error={showErrors && hasRightsError}
          />
        </div>
        <div className={classes.chipWrapper}>{displayActions}</div>
        {showErrors && hasRightsError && displayWarningCard('Du må velge minimum en rettighet.')}
        <Label className={classes.label} size='medium'>
          Hvem skal ha disse rettighetene?
        </Label>
        <div className={classes.dropdownWrapper}>
          <Select
            options={subjectOptions}
            onChange={(value: string) => value !== null && handleClickSubjectInList(value)}
            disabled={subjectOptions.length === 0}
            label={subjectOptions.length === 0 ? 'Alle roller er valgt' : 'Legg til rolle'}
            error={showErrors && hasSubjectsError}
          />
        </div>
        <div className={classes.chipWrapper}>{displaySubjects}</div>
        {showErrors && hasSubjectsError && displayWarningCard('Du må velge minimum en rolle.')}
        <Label className={classes.label} size='medium'>
          Legg til en beskrivelse av regelen
        </Label>
        <div className={classes.textAreaWrapper}>
          <TextArea
            resize='vertical'
            placeholder='Beskrivelse beskrevet her i tekst av tjenesteeier'
            value={policyRule.description}
            onChange={(e) => handleChangeDescription(e.currentTarget.value)}
            rows={5}
            aria-labelledby='ruleDescription'
            onBlur={() => savePolicy(rules)}
          />
          <ScreenReaderSpan id='ruleDescription' label='Beskrivelse av regelen' />
        </div>
      </ExpandablePolicyElement>
      {showErrors && displayWarningCard(getRuleErrorText())}
    </div>
  );
};
