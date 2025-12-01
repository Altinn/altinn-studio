import { redirect } from 'react-router-dom';
import type { LoaderFunctionArgs } from 'react-router-dom';

import { getApplicationMetadata, isStatelessApp2 } from 'src/domain/ApplicationMetadata/getApplicationMetadata';
import { getCurrentLayoutSet } from 'src/features/applicationMetadata/appMetadataUtils';
import { fetchRuleHandler } from 'src/http-client/queries';

const RULES_SCRIPT_ID = 'rules-script';

function clearExistingRules() {
  const rulesScript = document.getElementById(RULES_SCRIPT_ID);
  if (rulesScript) {
    rulesScript.remove();
  }
}

/**
 * React Router loader for prefetching form dynamics data.
 * This works alongside the existing DynamicsContext to provide instant data availability.
 */
export async function dynamicsLoader({ params }: LoaderFunctionArgs): Promise<unknown> {
  // const { layoutSets, instanceId } = context;
  const applicationMetadata = getApplicationMetadata();

  const layoutSets = window.AltinnAppInstanceData?.layoutSets;

  if (!layoutSets) {
    throw new Error('layout sets not found');
  }

  const instance = window.AltinnAppInstanceData?.instance;
  const { org, app, taskId } = params;
  const isStatelessApp = isStatelessApp2(!!instance?.id);

  const layoutSet = applicationMetadata
    ? getCurrentLayoutSet({
        application: applicationMetadata,
        layoutSets: layoutSets?.sets ?? [],
        taskId,
        isStatelessApp,
      })
    : undefined;

  const layoutSetId = layoutSet?.id ?? null;
  if (!layoutSetId) {
    // Redirect to error page when layout set is missing
    throw redirect(`/${org}/${app}/error?errorType=unknown&showContactInfo=true`);
  }

  try {
    const data = await fetchRuleHandler(layoutSetId);
    clearExistingRules();
    if (data) {
      const rulesScript = window.document.createElement('script');
      rulesScript.innerHTML = data;
      rulesScript.id = RULES_SCRIPT_ID;
      window.document.body.appendChild(rulesScript);
    }
    return {};
  } catch (e) {
    // Redirect to error page when rule handler fails
    throw redirect(`/${org}/${app}/error?errorType=unknown&showContactInfo=true`);
  }
}

/**
 * Helper function to create the loader with access to the required context.
 * Use this in your router configuration.
 */
export function createDynamicsLoader() {
  return (args: LoaderFunctionArgs) => dynamicsLoader({ ...args });
}
