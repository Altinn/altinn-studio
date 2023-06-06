import React, { useState } from 'react';
import classes from './PolicyEditorPage.module.css';
import { PolicyActionType, PolicyBackendType, PolicySubjectType } from 'resourceadm/types/global';
import { useParams } from 'react-router-dom';
import { actionsListMock, subjectsListMock } from 'resourceadm/data-mocks/policies';
import { get, put } from 'app-shared/utils/networking';
import { getPolicyRulesUrl } from 'resourceadm/utils/backendUrlUtils';
import { PolicyEditor } from 'resourceadm/components/PolicyEditor';
import {
  getActionOptionsUrlByOrgAndRepo,
  getPolicyUrlByOrgRepoAndId,
  getSubjectOptionsUrlByOrgAndRepo,
} from 'resourceadm/utils/backendUrlUtils/backendUserUtils';
import { useOnce } from 'resourceadm/hooks/useOnce';

/**
 * Displays the content where a user can add and edit a policy
 */
export const PolicyEditorPage = () => {
  // TODO - translation

  const { resourceId, org, repo } = useParams();
  const resourceType = 'urn:altinn.resource'; // TODO - Find out if it is fine to hardcode this

  // TODO - replace with list from backend
  const [actions, setActions] = useState<PolicyActionType[]>([]);
  const [subjects, setSubjects] = useState<PolicySubjectType[]>([]);
  const [policy, setPolicy] = useState<PolicyBackendType>();
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  /**
   * Get the policy, actions, and subjects when the page loads
   */
  useOnce(() => {
    // Get the ations when page loads
    get(getActionOptionsUrlByOrgAndRepo(org, repo))
      .then((res) => {
        setActions(res);
      })
      .catch((err) => {
        console.log({ err });
        console.error(err);
      });

    // Get the subjects when page loads
    get(getSubjectOptionsUrlByOrgAndRepo(org, repo))
      .then((res) => {
        setSubjects(res);
      })
      .catch((err) => {
        console.log({ err });
        console.error(err);
      });

    // Start loading when trying to get the policies
    setLoading(true);
    // legg på param for å kjøre mot backend eller mock.
    // E.g., http://studio.localhost/resourceadm/ttd/resourceadm-resources/resource/resource_id_1/policy
    get(getPolicyRulesUrl(org, repo, resourceId))
      .then((res: unknown) => {
        const policyRes: PolicyBackendType = res as PolicyBackendType;

        // TODO - do more checks
        setPolicy(policyRes);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        console.log({ e });
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
    console.log('Object to be sent as JSON object: \n', JSON.stringify(p, null, 2));

    put(getPolicyUrlByOrgRepoAndId(org, repo, resourceId), p)
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
      // TODO spinner
      return <p>Loading content</p>;
    }
    /*if (hasError) {
      // TODO handle error
      return <p>error</p>;
    }*/
    if (policy === undefined) {
      return (
        <>
          <p>Hei</p>
          <PolicyEditor
            policy={{
              rules: [],
              requiredAuthenticationLevelEndUser: '3',
              requiredAuthenticationLevelOrg: '3',
            }}
            actions={actions}
            subjects={subjects}
            resourceType={resourceType}
            resourceId={resourceId}
            onSave={handleSavePolicy} // TODO
          />
        </>
      );
    }
    return (
      <PolicyEditor
        policy={policy}
        actions={actions}
        subjects={subjects}
        resourceType={resourceType}
        resourceId={resourceId}
        onSave={handleSavePolicy}
      />
    );
  };

  return <div className={classes.policyEditorWrapper}>{displayContent()}</div>;
};
