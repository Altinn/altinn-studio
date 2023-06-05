import React, { useEffect, useState } from 'react';
import classes from './PolicyEditorPage.module.css';
import { PolicyBackendType, PolicySubjectType } from 'resourceadm/types/global';
import { useParams } from 'react-router-dom';
import { actionsListMock, subjectsListMock } from 'resourceadm/data-mocks/policies';
import { get, put } from 'app-shared/utils/networking';
import { getPolicyRulesUrl } from 'resourceadm/utils/backendUrlUtils';
import { PolicyEditor } from 'resourceadm/components/PolicyEditor';
import { getPolicyUrlByOrgRepoAndId } from 'resourceadm/utils/backendUrlUtils/backendUserUtils';

/**
 * Displays the content where a user can add and edit a policy
 */
export const PolicyEditorPage = () => {
  // TODO - translation

  const { resourceId, org, repo } = useParams();
  const resourceType = 'urn:altinn.resource'; // TODO - Find out if it is fine to hardcode this

  // TODO - replace with list from backend
  const [actions, setActions] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<PolicySubjectType[]>([]);
  const [policy, setPolicy] = useState<PolicyBackendType>();
  const [loading, setLoading] = useState(false);

  // TODO - implement useOnce hook to get the policy
  useEffect(() => {
    // TODO - API Call to get the correct actions, AND TRANSLATE THEM
    setActions(actionsListMock);
    // TODO - API Call to get the correct subjects
    setSubjects(subjectsListMock);

    // TODO - add useOnce hook
    if (policy === undefined) {
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
        });
    }

    /**
     * IF you do not want to run against backend, comment out the get above,
     * and coment in the code below
     */
    // setPolicyRules(mapPolicyRulesBackendObjectToPolicyRuleCardType(subjectsListMock, resourceId === 'resource_id_1' ? policyMock1.rules : policyMock2.rules));
    // setLastRuleId(resourceId === 'resource_id_1' ? policyMock1.rules.length + 1 : policyMock2.rules.length + 1);
  }, [policy, org, repo, resourceId]);

  const handleSavePolicy = (p: PolicyBackendType) => {
    put(getPolicyUrlByOrgRepoAndId(org, repo, resourceId), p)
      .then(() => {
        console.log('success');
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
    if (policy === undefined) {
      // TODO handle error
      return <p>error</p>;
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
