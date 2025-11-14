import type { LoaderFunctionArgs } from 'react-router-dom';

import type { QueryClient } from '@tanstack/react-query';

import { getCurrentLayoutSet } from 'src/features/applicationMetadata/appMetadataUtils';
import { fetchRuleHandler } from 'src/queries/queries';
import type { IncomingApplicationMetadata } from 'src/features/applicationMetadata/types';
import type { ILayoutSets } from 'src/layout/common.generated';
// import type { ApplicationMetadata } from 'src/features/applicationMetadata/types';
// import type { LayoutSets } from 'src/features/form/layoutSets/LayoutSetsProvider';

export interface DynamicsLoaderContext {
  queryClient: QueryClient;
  application?: IncomingApplicationMetadata | (() => IncomingApplicationMetadata | undefined);
  layoutSets?: ILayoutSets | (() => ILayoutSets | undefined);
}

export interface DynamicsLoaderData {
  layoutSetId: string | null;
  preloaded: boolean;
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
export async function dynamicsLoader({
  params,
  context,
}: LoaderFunctionArgs & { context: DynamicsLoaderContext }): Promise<unknown> {
  const { application, layoutSets } = context;

  const { taskId } = params;

  const resolvedApplication = typeof application === 'function' ? application() : application;
  const resolvedLayoutSets = typeof layoutSets === 'function' ? layoutSets() : layoutSets;

  const layoutSet = getCurrentLayoutSet({
    application: resolvedApplication,
    layoutSets: resolvedLayoutSets?.sets ?? [],
    taskId,
  });

  const layoutSetId = layoutSet?.id ?? null;
  if (!layoutSetId) {
    throw new Error(`layout set id ${layoutSetId} not found in rule loader. This should not happen here.`);
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
    console.log(e);
  }
}

/**
 * Helper function to create the loader with access to the required context.
 * Use this in your router configuration.
 */
export function createDynamicsLoader(context: DynamicsLoaderContext) {
  return (args: LoaderFunctionArgs) => dynamicsLoader({ ...args, context });
}
