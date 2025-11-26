import { redirect } from 'react-router-dom';
import type { LoaderFunctionArgs } from 'react-router-dom';

import { processApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { getCurrentLayoutSet } from 'src/features/applicationMetadata/appMetadataUtils';
import { fetchRuleHandler } from 'src/http-client/queries';
import type { IncomingApplicationMetadata } from 'src/features/applicationMetadata/types';
import type { ILayoutSets } from 'src/layout/common.generated';

interface DynamicsLoaderProps extends LoaderFunctionArgs {
  context: {
    application?: IncomingApplicationMetadata | (() => IncomingApplicationMetadata | undefined);
    layoutSets?: ILayoutSets | (() => ILayoutSets | undefined);
    instanceId: string | (() => string | undefined);
  };
}

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
export async function dynamicsLoader({ params, context }: DynamicsLoaderProps): Promise<unknown> {
  const { application, layoutSets, instanceId } = context;

  const { org, app, taskId } = params;

  const resolvedInstanceId = typeof instanceId === 'function' ? instanceId() : instanceId;
  const resolvedApplication = typeof application === 'function' ? application() : application;
  const resolvedLayoutSets = typeof layoutSets === 'function' ? layoutSets() : layoutSets;

  const layoutSet = resolvedApplication
    ? getCurrentLayoutSet({
        application: processApplicationMetadata(resolvedInstanceId, resolvedApplication),
        layoutSets: resolvedLayoutSets?.sets ?? [],
        taskId,
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
    // eslint-disable-next-line no-console
    console.log(e);
    // Redirect to error page when rule handler fails
    throw redirect(`/${org}/${app}/error?errorType=unknown&showContactInfo=true`);
  }
}

/**
 * Helper function to create the loader with access to the required context.
 * Use this in your router configuration.
 */
export function createDynamicsLoader(context: DynamicsLoaderProps['context']) {
  return (args: LoaderFunctionArgs) => dynamicsLoader({ ...args, context });
}
