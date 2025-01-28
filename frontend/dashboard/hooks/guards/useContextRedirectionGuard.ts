import type { Organization } from 'app-shared/types/Organization';
import { useEffect, useState } from 'react';
import { useSelectedContext } from '../useSelectedContext';
import type { NavigateFunction } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { SelectedContextType } from 'dashboard/context/HeaderContext';
import { typedSessionStorage } from '@studio/pure-functions';
import { userHasAccessToSelectedContext } from 'dashboard/utils/userUtils';
import { useSubRoute } from '../useSubRoute';

export type UseRedirectionGuardResult = {
  isRedirectionComplete: boolean;
};

export const useContextRedirectionGuard = (
  organizations: Organization[],
): UseRedirectionGuardResult => {
  const selectedContext = useSelectedContext();
  const subRoute = useSubRoute();
  const navigate = useNavigate();
  const [isContextRedirectionComplete, setIsContextRedirectionComplete] = useState<boolean>(false);

  if (selectedContext !== SelectedContextType.None) {
    typedSessionStorage.setItem('dashboard::selectedContext', selectedContext);
  }

  useEffect(() => {
    handleContextRedirection(subRoute, selectedContext, organizations, navigate);
    setIsContextRedirectionComplete(true);
  }, [selectedContext, organizations, navigate, subRoute]);

  return {
    isRedirectionComplete: isContextRedirectionComplete,
  };
};

const handleContextRedirection = (
  subRoute: string,
  currentContext: SelectedContextType | string,
  organizations: Organization[],
  navigate: NavigateFunction,
): void => {
  const targetContext = getTargetContext(currentContext);

  if (!hasAccessToContext(targetContext, organizations)) {
    navigateToContext(subRoute, SelectedContextType.Self, navigate);
    return;
  }

  if (targetContext === currentContext) return;
  navigateToContext(subRoute, targetContext, navigate);
};

const getTargetContext = (
  currentContext: SelectedContextType | string,
): SelectedContextType | string => {
  if (currentContext === SelectedContextType.None) {
    return typedSessionStorage.getItem('dashboard::selectedContext') || SelectedContextType.Self;
  }
  return currentContext;
};

const hasAccessToContext = (
  targetContext: SelectedContextType | string,
  organizations: Organization[],
): boolean => {
  return (
    organizations &&
    userHasAccessToSelectedContext({ selectedContext: targetContext, orgs: organizations })
  );
};

const navigateToContext = (
  subRoute: string,
  targetContext: SelectedContextType | string,
  navigate: NavigateFunction,
): void => {
  navigate(subRoute + '/' + targetContext + location.search, { replace: true });
};
