import { matchPath, useLocation } from 'react-router-dom';

import { useAsRef } from 'src/hooks/useAsRef';

interface PathParams {
  instanceOwnerPartyId?: string;
  instanceGuid?: string;
  taskId?: string;
  pageKey?: string;
  componentId?: string;
  dataElementId?: string;
  mainPageKey?: string;
}

export enum SearchParams {
  FocusComponentId = 'focusComponentId',
  FocusErrorBinding = 'focusErrorBinding',
  ExitSubform = 'exitSubform',
  Validate = 'validate',
  Pdf = 'pdf',
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
  const matches = matchers.map((matcher) => matchPath(matcher, path));
  return {
    instanceOwnerPartyId: paramFrom(matches, 'instanceOwnerPartyId'),
    instanceGuid: paramFrom(matches, 'instanceGuid'),
    taskId: paramFrom(matches, 'taskId'),
    pageKey: paramFrom(matches, 'pageKey'),
    componentId: paramFrom(matches, 'componentId'),
    dataElementId: paramFrom(matches, 'dataElementId'),
    mainPageKey: paramFrom(matches, 'mainPageKey'),
  };
}

export const useNavigationParam = <T extends keyof PathParams>(key: T) => {
  const location = useLocation();
  const matches = matchers.map((matcher) => matchPath(matcher, location.pathname));
  return paramFrom(matches, key) as PathParams[T];
};

export const useAllNavigationParams = () => matchParams(useLocation().pathname);
export const useAllNavigationParamsAsRef = () => useAsRef(useAllNavigationParams());

export const useQueryKey = (key: SearchParams) => new URLSearchParams(useLocation().search).get(key);

export const useIsSubformPage = () => {
  const location = useLocation();
  const matches = matchers.map((matcher) => matchPath(matcher, location.pathname));
  const mainPageKey = paramFrom(matches, 'mainPageKey');
  const subformPageKey = paramFrom(matches, 'pageKey');
  return !!(mainPageKey && subformPageKey);
};

export const useIsReceiptPage = () => {
  const location = useLocation();
  const matches = matchers.map((matcher) => matchPath(matcher, location.pathname));
  const taskId = paramFrom(matches, 'taskId');
  return taskId === 'ProcessEnd' || taskId === 'CustomReceipt';
};
