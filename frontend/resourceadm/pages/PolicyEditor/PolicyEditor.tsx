import React, { useEffect, useState } from 'react';
import classes from './PolicyEditor.module.css';
import { ExpandablePolicyCard } from 'resourceadm/components/ExpandablePolicyCard';
import { CardButton } from 'resourceadm/components/CardButton';
import { Button } from '@digdir/design-system-react';
import {
  PolicyEditorSendType,
  PolicyRuleCardType,
  PolicyRuleBackendType,
  PolicySubjectType,
  RequiredAuthLevelType,
} from 'resourceadm/types/global';
import { useParams } from 'react-router-dom';
import {
  actionsListMock,
  policyMock1,
  policyMock2,
  subjectsListMock,
} from 'resourceadm/data-mocks/policies';
import {
  mapPolicyRulesBackendObjectToPolicyRuleCardType,
  emptyPolicyRule,
  mapPolicyRuleToPolicyRuleBackendObject,
} from 'resourceadm/utils/policyEditorUtils';
import { VerificationModal } from 'resourceadm/components/VerificationModal';
import { SelectAuthLevel } from 'resourceadm/components/SelectAuthLevel';

/**
 * Displays the content where a user can add and edit a policy
 */
export const PolicyEditor = () => {
  // TODO - translation

  // TODO - legge på
  /*
requiredAuthenticationLevelEndUser: "2"  // Nedtrekk 1-4 - Påloggingsnivå - default 3. - Sette på toppen
requiredAuthenticationLevelOrg: null  // Denne er 3 hele tiden.
  */

  const { resourceId } = useParams();
  const resourceType = 'urn:altinn.resource'; // TODO - Find out if it is fine to hardcode this

  // TODO - replace with list from backend
  const [actions, setActions] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<PolicySubjectType[]>([]);
  const [policyRules, setPolicyRules] = useState<PolicyRuleCardType[]>([]);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);

  const [requiredAuthLevel, setRequiredAuthLevel] = useState<RequiredAuthLevelType>('3');

  // Handle the new updated IDs of the rules when a rule is deleted / duplicated
  const [lastRuleId, setLastRuleId] = useState(0);

  // To keep track of which rule to delete
  const [ruleIdToDelete, setRuleIdToDelete] = useState('0');

  // TODO - implement useOnce hook to get the policy
  useEffect(() => {
    // TODO - API Call to get the correct actions, AND TRANSLATE THEM
    setActions(actionsListMock);
    // TODO - API Call to get the correct subjects
    setSubjects(subjectsListMock);

    // TODO - API Call to get policy by the resource ID
    // TODO - Find out what the object sent from backend looks like
    setPolicyRules(
      mapPolicyRulesBackendObjectToPolicyRuleCardType(
        subjectsListMock,
        resourceId === 'test_id_1' ? policyMock1.rules : policyMock2.rules
      )
    );

    // TODO - replace when found out how to handle the IDs
    setLastRuleId(
      resourceId === 'test_id_1' ? policyMock1.rules.length + 1 : policyMock2.rules.length + 1
    );
  }, [resourceId]);

  /**
   * Displays all the rule cards
   */
  const displayRules = policyRules.map((pr, i) => (
    <div className={classes.space} key={i}>
      <ExpandablePolicyCard
        policyRule={pr}
        actions={actions}
        subjects={subjects}
        rules={policyRules}
        setPolicyRules={setPolicyRules}
        rulePosition={i}
        resourceId={resourceId}
        resourceType={resourceType}
        handleDuplicateRule={() => handleDuplicateRule(i)}
        handleDeleteRule={() => {
          setVerificationModalOpen(true);
          setRuleIdToDelete(pr.ruleId);
        }}
      />
    </div>
  ));

  /**
   * Returns the rule ID to be used on the new element, and
   * updates the store of the next rule id
   */
  const getRuleId = () => {
    const currentRuleId = lastRuleId;
    setLastRuleId(currentRuleId + 1);
    return currentRuleId;
  };

  /**
   * Handles adding of more cards
   */
  const handleAddCardClick = () => {
    setPolicyRules((prevRules) => [
      ...prevRules,
      ...[
        {
          ...emptyPolicyRule,
          RuleId: getRuleId().toString(),
          Resources: [[{ type: resourceType, id: resourceId }]],
        },
      ],
    ]);
  };

  /**
   * Duplicates a rule with all the content in it
   *
   * @param index the index of the rule to duplicate
   */
  const handleDuplicateRule = (index: number) => {
    const ruleToDuplicate: PolicyRuleCardType = {
      ...policyRules[index],
      ruleId: getRuleId().toString(),
    };
    setPolicyRules([...policyRules, ruleToDuplicate]);
  };

  /**
   * Deletes a rule from the list
   *
   * @param index the index of the rule to delete
   */
  const handleDeleteRule = (ruleId: string) => {
    const updatedRules = [...policyRules];
    const indexToRemove = updatedRules.findIndex((a) => a.ruleId === ruleId);
    updatedRules.splice(indexToRemove, 1);
    setPolicyRules(updatedRules);

    // Reset
    setVerificationModalOpen(false);
    setRuleIdToDelete('0');
  };

  /**
   * Handle the saving of the updated policy
   */
  const handleSavePolicy = () => {
    const policyEditorRules: PolicyRuleBackendType[] = policyRules.map((pr) =>
      mapPolicyRuleToPolicyRuleBackendObject(subjects, pr, resourceType, resourceId)
    );

    const resourceWithRules: PolicyEditorSendType = {
      rules: policyEditorRules,
      requiredAuthenticationLevelEndUser: requiredAuthLevel,
      requiredAuthenticationLevelOrg: '3',
    };

    // TODO - Error handling
    console.log('Object to be sent as JSON object: \n', JSON.stringify(resourceWithRules, null, 2));
  };

  return (
    // TODO - display spinner when loading
    // TODO - display error if resourceId === null
    <div className={classes.policyEditorWrapper}>
      <div>
        <div className={classes.policyEditorTop}>
          <h2 className={classes.policyEditorHeader}>Policy editor</h2>
          <p className={classes.subHeader}>Navn på policyen</p>
          <div className={classes.textFieldIdWrapper}>
            <div className={classes.idBox}>
              <p className={classes.idBoxText}>id</p>
            </div>
            <p className={classes.idText}>{resourceId}</p>
          </div>
        </div>
        <div className={classes.selectAuthLevelWrapper}>
          <p className={classes.subHeader}>Velg påkrevd sikkerhetsnivå for bruker</p>
          <SelectAuthLevel value={requiredAuthLevel} setValue={(v) => setRequiredAuthLevel(v)} />
        </div>
        <p className={classes.subHeader}>Regler for policyen</p>
        {displayRules}
        <div className={classes.addCardButtonWrapper}>
          <CardButton buttonText='Legg til ekstra regelsett' onClick={handleAddCardClick} />
        </div>
        <Button type='button' onClick={handleSavePolicy}>
          Lagre policyen
        </Button>
        <VerificationModal
          isOpen={verificationModalOpen}
          onClose={() => setVerificationModalOpen(false)}
          text='Er du sikker på at du vil slette denne regelen?'
          closeButtonText='Nei, gå tilbake'
          actionButtonText='Ja, slett regel'
          onPerformAction={() => handleDeleteRule(ruleIdToDelete)}
        />
      </div>
    </div>
  );
};
