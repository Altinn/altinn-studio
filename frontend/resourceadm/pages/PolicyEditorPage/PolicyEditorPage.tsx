import React, { useState } from 'react';
import classes from './PolicyEditorPage.module.css';
import { PolicyActionType, PolicyBackendType, PolicySubjectType } from 'resourceadm/types/global';
import { useParams } from 'react-router-dom';
import { get, put } from 'app-shared/utils/networking';
import { PolicyEditor } from 'resourceadm/components/PolicyEditor';
import {
  getActionOptionsUrlBySelectedContextAndRepo,
  getPolicyUrlBySelectedContextRepoAndId,
  getSubjectOptionsUrlBySelectedContextAndRepo,
} from 'resourceadm/utils/backendUrlUtils/backendUserUtils';
import { useOnce } from 'resourceadm/hooks/useOnce';
import {
  mapPolicyActionResultToPolicyActions,
  mapPolicyResultToPolicyObject,
  mapPolicySubjectResultToPolicySubjects,
} from 'resourceadm/utils/mapperUtils';
import { emptyPolicy } from 'resourceadm/utils/policyEditorUtils';
import { Spinner } from '@digdir/design-system-react';

interface Props {
  showAllErrors: boolean;
}

/**
 * Displays the content where a user can add and edit a policy
 *
 * @param props.showAllErrors flag to decide if all errors should be shown or not
 */
export const PolicyEditorPage = ({ showAllErrors }: Props) => {
  // TODO - translation

  const { resourceId, selectedContext } = useParams();
  const resourceType = 'urn:altinn.resource'; // TODO - Find out if it is fine to hardcode this
  const repo = `${selectedContext}-resources`;

  const [actions, setActions] = useState<PolicyActionType[]>([]);
  const [subjects, setSubjects] = useState<PolicySubjectType[]>([]);
  const [policy, setPolicy] = useState<PolicyBackendType>(emptyPolicy);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  /**
   * Get the policy, actions, and subjects when the page loads
   */
  useOnce(() => {
    // Start loading when trying to get the policies
    setLoading(true);

    // Get the ations when page loads
    get(getActionOptionsUrlBySelectedContextAndRepo(selectedContext, repo))
      .then((actionResult: unknown) => {
        // Set the actions
        setActions(mapPolicyActionResultToPolicyActions(actionResult));

        // Get the subjects when page loads
        get(getSubjectOptionsUrlBySelectedContextAndRepo(selectedContext, repo))
          .then((subjectResult: unknown) => {
            // Set the subjects
            setSubjects(mapPolicySubjectResultToPolicySubjects(subjectResult));

            // E.g., http://studio.localhost/designer/api/ttd/ttd-resources/policy/resource_id_7
            get(getPolicyUrlBySelectedContextRepoAndId(selectedContext, repo, resourceId))
              .then((policyResult: unknown) => {
                // Set the policy
                setPolicy(mapPolicyResultToPolicyObject(policyResult));
                setLoading(false);
              })
              .catch((err) => {
                console.error('Error getting the policy', err);
                setLoading(false);
                setHasError(true);
              });
          })
          .catch((err) => {
            console.error('Error getting the subjects', err);
            setLoading(false);
            setHasError(true);
          });
      })
      .catch((err) => {
        console.error('Error getting the actions', err);
        setLoading(false);
        setHasError(true);
      });

    /**
     * IF you do not want to run against backend, comment out the getters above,
     * and coment in the code below
     */
    // setActions(actionsListMock);
    // setSubjects(subjectsListMock);
    // setPolicyRules(mapPolicyRulesBackendObjectToPolicyRuleCardType(subjectsListMock, resourceId === 'resource_id_1' ? policyMock1.rules : policyMock2.rules));
    // setLastRuleId(resourceId === 'resource_id_1' ? policyMock1.rules.length + 1 : policyMock2.rules.length + 1);
  });

  const handleSavePolicy = (p: PolicyBackendType) => {
    // TODO - Error handling
    put(getPolicyUrlBySelectedContextRepoAndId(selectedContext, repo, resourceId), p)
      .then((res) => {
        console.log('success', res);
        // TODO - maybe add a success message / card?
      })
      .catch((err) => {
        console.error(err);
        console.log({ err });
        // TODO - handle error
      });
  };

  /**
   * Displays the content based on the state of the page
   */
  const displayContent = () => {
    if (loading) {
      return (
        <div className={classes.spinnerWrapper}>
          <Spinner size='3xLarge' variant='interaction' title='Laster inn policy' />
        </div>
      );
    }
    // TODO error handling
    if (hasError) {
      return <p>Beklager, det skjedde en feil under innhenting av innholdet</p>;
    }
    return (
      <PolicyEditor
        policy={policy}
        actions={actions}
        subjects={subjects}
        resourceType={resourceType}
        resourceId={resourceId}
        onSave={handleSavePolicy}
        showAllErrors={showAllErrors}
      />
    );
  };

  return <div className={classes.policyEditorWrapper}>{displayContent()}</div>;
};
