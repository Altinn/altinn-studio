import { matchPath, useLocation } from 'react-router';

import { GlobalData } from 'src/GlobalData';
import { useAsRef } from 'src/hooks/useAsRef';
import type { SearchParams } from 'src/core/routing/types';

interface PathParams {
  instanceOwnerPartyId?: string;
  instanceGuid?: string;
  taskId?: string;
  pageKey?: string;
  componentId?: string;
  dataElementId?: string;
  mainPageKey?: string;
}

const matchers: string[] = [
  '/instance/:instanceOwnerPartyId/:instanceGuid',
  '/instance/:instanceOwnerPartyId/:instanceGuid/:taskId',
  '/instance/:instanceOwnerPartyId/:instanceGuid/:taskId/:pageKey',
  '/:pageKey', // Stateless

  // Subform
  '/instance/:instanceOwnerPartyId/:instanceGuid/:taskId/:mainPageKey/:componentId',
  '/instance/:instanceOwnerPartyId/:instanceGuid/:taskId/:mainPageKey/:componentId/:dataElementId',
  '/instance/:instanceOwnerPartyId/:instanceGuid/:taskId/:mainPageKey/:componentId/:dataElementId/:pageKey',
];

type Matches = ReturnType<typeof matchPath>[];

const requiresDecoding: Set<keyof PathParams> = new Set(['pageKey', 'mainPageKey']);

function paramFrom(matches: Matches, key: keyof PathParams): string | undefined {
  const param = matches.reduce((acc, match) => acc ?? match?.params[key], undefined);
  const decode = requiresDecoding.has(key);
  return decode && param ? decodeURIComponent(param) : param;
}

function matchParams(path: string): PathParams {
  if (path === cachedParamsPath) {
    return cachedParams;
  }

  const matches = matchers.map((matcher) => matchPath(matcher, path));
  cachedParamsPath = path;
  cachedParams = {
    instanceOwnerPartyId: paramFrom(matches, 'instanceOwnerPartyId'),
    instanceGuid: paramFrom(matches, 'instanceGuid'),
    taskId: paramFrom(matches, 'taskId'),
    pageKey: paramFrom(matches, 'pageKey'),
    componentId: paramFrom(matches, 'componentId'),
    dataElementId: paramFrom(matches, 'dataElementId'),
    mainPageKey: paramFrom(matches, 'mainPageKey'),
  };
  return cachedParams;
}

let cachedParamsPath: string | undefined;
let cachedParams: PathParams = {};

export const useNavigationParam = <T extends keyof PathParams>(key: T) => {
  const location = useLocation();
  return matchParams(location.pathname)[key];
};

export const useAllNavigationParams = () => matchParams(useLocation().pathname);
export const useAllNavigationParamsAsRef = () => useAsRef(useAllNavigationParams());

/**
 * The params of the instance URL the browser shows now, or undefined when it shows no instance. The hooks above give
 * the params as of the last render, which go stale in a callback that outlives its component, such as a mutation's.
 */
export function getLiveInstanceNavigationParams(): PathParams | undefined {
  const { pathname } = window.location;
  const basename = GlobalData.basename;
  return pathname.startsWith(`${basename}/instance/`) ? matchParams(pathname.slice(basename.length)) : undefined;
}

export const useQueryKey = (key: SearchParams) => new URLSearchParams(useLocation().search).get(key);

export const useIsSubformPage = () => {
  const location = useLocation();
  const { mainPageKey, pageKey: subformPageKey } = matchParams(location.pathname);
  return !!(mainPageKey && subformPageKey);
};
