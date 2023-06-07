import React, { useState } from 'react';
import { Button, TextArea } from '@digdir/design-system-react';
import { ExclamationmarkTriangleFillIcon } from '@navikt/aksel-icons';
import classes from './ExpandablePolicyCard.module.css';
import {
  PolicyActionType,
  PolicyRuleCardType,
  PolicyRuleResourceType,
  PolicySubjectType,
} from 'resourceadm/types/global';
import { PolicyRuleSubjectListItem } from '../PolicyRuleSubjectListItem';
import { PolicySubjectSelectButton } from '../PolicySubjectSelectButton';
import { ResourceNarrowingList } from '../ResourceNarrowingList';
import { WarningCard } from '../WarningCard';
import { ExpandablePolicyElement } from '../ExpandablePolicyElement';
import { Chip } from '../../Chip';

interface Props {
  policyRule: PolicyRuleCardType;
  actions: PolicyActionType[];
  subjects: PolicySubjectType[];
  rules: PolicyRuleCardType[];
  setPolicyRules: React.Dispatch<React.SetStateAction<PolicyRuleCardType[]>>;
  resourceId: string;
  resourceType: string;
  handleDuplicateRule: () => void;
  handleDeleteRule: () => void;
}

/**
 * Component that displays a card where a user can view and update a policy rule
 * for a resource.
 *
 * @param props.policyRule the rule to display in the card
 * @param props.actions the possible actions to select from
 * @param props.subjects the possible subjects to select from
 * @param props.rules the list of all the rules
 * @param props.setPolicyRules useState function to update the list of rules
 * @param props.resourceId the ID of the resource
 * @param props.resourceType the type of the resource
 * @param props.handleDuplicateRule function to be executed when clicking duplicate rule
 * @param props.handleDeleteRule function to be executed when clicking delete rule
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
}: Props) => {
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
   */
  const updateRules = (d: string, s: string[], a: string[], r: PolicyRuleResourceType[][]) => {
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
   * @param resourceIndex the index of the resource block
   */
  const handleInputChange = (
    index: number,
    field: 'id' | 'type',
    value: string,
    resourceIndex: number
  ) => {
    const updatedResources = [...policyRule.resources];
    updatedResources[resourceIndex][index] = {
      ...updatedResources[resourceIndex][index],
      [field]: value,
    };
    updateRules(policyRule.description, policyRule.subject, policyRule.actions, updatedResources);
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
    updateRules(policyRule.description, policyRule.subject, policyRule.actions, updatedResources);

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

    updateRules(policyRule.description, policyRule.subject, policyRule.actions, updatedResources);
  };

  /**
   * Handles the removal of the narrowed resources
   */
  const handleRemoveNarrowingResource = (index: number, resourceIndex: number) => {
    const updatedResources = [...policyRule.resources];
    updatedResources[resourceIndex].splice(index, 1);
    updateRules(policyRule.description, policyRule.subject, policyRule.actions, updatedResources);
  };

  /**
   * Displays the actions
   */
  const displayActions = actions.map((a, i) => (
    <Chip
      key={i}
      text={a.actionTitle}
      isSelected={policyRule.actions.includes(a.actionTitle)}
      onClick={() => handleClickAction(i, a.actionTitle)}
    />
  ));

  /**
   * Removes or adds an action
   */
  const handleClickAction = (index: number, action: string) => {
    const updatedSelectedActions = [...policyRule.actions];

    // If already present, remove it and check if there is an error
    if (policyRule.actions.includes(actions[index].actionTitle)) {
      const selectedActionIndex = policyRule.actions.findIndex((a) => a === action);
      updatedSelectedActions.splice(selectedActionIndex, 1);
      setHasRightsErrors(updatedSelectedActions.length === 0);
    }
    // else add it and remove the action error
    else {
      updatedSelectedActions.push(action);
      setHasRightsErrors(false);
    }

    updateRules(
      policyRule.description,
      policyRule.subject,
      updatedSelectedActions,
      policyRule.resources
    );
  };

  /**
   * Displays the selected subjects
   */
  const displaySubjects = policyRule.subject.map((s, i) => {
    return (
      <PolicyRuleSubjectListItem
        key={i}
        subjectTitle={s}
        onRemove={() => handleRemoveSubject(i, s)}
      />
    );
  });

  /**
   * Handles the removal of resources
   */
  const handleRemoveSubject = (index: number, subjectTitle: string) => {
    // Remove from selected list
    const updatedSubjects = [...policyRule.subject];
    updatedSubjects.splice(index, 1);

    // Add to options list
    setSubjectOptions([...subjectOptions, { value: subjectTitle, label: subjectTitle }]);
    //updateRules(ruleDescription, updatedSubjects, selectedActions, resources);
    updateRules(policyRule.description, updatedSubjects, policyRule.actions, policyRule.resources);

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
      policyRule.resources
    );

    setHasSubjectsError(false);
  };

  /**
   * Updates the description of the rule
   */
  const handleChangeDescription = (description: string) => {
    updateRules(description, policyRule.subject, policyRule.actions, policyRule.resources);
  };

  /**
   * Duplicates a resource group and all the content in it.
   *
   * @param resourceIndex the index of the resource group to duplicate
   */
  const handleDuplicateResourceGroup = (resourceIndex: number) => {
    const resourceGroupToDuplicate: PolicyRuleResourceType[] = policyRule.resources[resourceIndex];
    const updatedResources = [...policyRule.resources, resourceGroupToDuplicate];
    updateRules(policyRule.description, policyRule.subject, policyRule.actions, updatedResources);
  };

  /**
   * Removes a resource group and all the content in it.
   *
   * @param resourceIndex the index of the resource group to remove
   */
  const handleDeleteResourceGroup = (resourceIndex: number) => {
    const updatedResources = [...policyRule.resources];
    updatedResources.splice(resourceIndex, 1);
    updateRules(policyRule.description, policyRule.subject, policyRule.actions, updatedResources);

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
        <WarningCard text={text} />
      </div>
    );
  };

  /**
   * Gets if there is an error in the rule card
   */
  const getHasRuleError = () => {
    return hasResourceError || hasRightsError || hasSubjectsError;
  };

  return (
    <div className={classes.wrapper}>
      <div className={classes.cardWrapper}>
        <ExpandablePolicyElement
          title={`Regel ${getPolicyRuleId()}`}
          isCard
          handleDuplicateElement={handleDuplicateRule}
          handleRemoveElement={handleDeleteRule}
        >
          <p className={classes.subHeader}>Hvilken ressurser skal regelen gjelde for?</p>
          {displayResources}
          <div className={classes.addResourceButton}>
            <Button type='button' onClick={handleClickAddResource} color='secondary'>
              Legg til en ressurs
            </Button>
          </div>
          {hasResourceError && displayWarningCard('Du må legge til en ressurs')}
          <p className={classes.subHeader}>Hvilke rettigheter skal gis?</p>
          <p className={classes.smallText}>Velg minimum ett alternativ fra listen under</p>
          <div className={classes.chipWrapper}>{displayActions}</div>
          {hasRightsError && displayWarningCard('Du må legge til hvilken rettigheter som skal gis')}
          <p className={classes.subHeader}>Hvem skal ha disse rettighetene?</p>
          {displaySubjects}
          {subjectOptions.length > 0 && (
            <PolicySubjectSelectButton
              options={subjectOptions}
              onChange={handleClickSubjectInList}
            />
          )}
          {hasSubjectsError &&
            displayWarningCard('Du må legge til hvem rettighetene skal gjelde for')}
          <p className={classes.subHeader}>Legg til en beskrivelse av regelen</p>
          <div className={classes.textAreaWrapper}>
            <TextArea
              resize='vertical'
              placeholder='Beskrivelse beskrevet her i tekst av tjenesteeier'
              value={policyRule.description}
              onChange={(e) => handleChangeDescription(e.currentTarget.value)}
              rows={5}
            />
          </div>
        </ExpandablePolicyElement>
      </div>
      {getHasRuleError() && (
        <div className={classes.ruleWarning}>
          <ExclamationmarkTriangleFillIcon title='The rule has a warning' fontSize='2rem' />
        </div>
      )}
    </div>
  );
};
