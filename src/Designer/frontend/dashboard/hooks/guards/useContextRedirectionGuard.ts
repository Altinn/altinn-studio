import type { Organization } from 'app-shared/types/Organization';
import { useEffect, useState } from 'react';
import { useSelectedContext } from '../useSelectedContext';
import type { NavigateFunction } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { SelectedContextType } from '../../enums/SelectedContextType';
import { typedSessionStorage } from '@studio/pure-functions';
import { userHasAccessToSelectedContext } from '../../utils/userUtils';
import { useSubroute } from '../useSubRoute';

export type UseRedirectionGuardResult = {
  isRedirectionComplete: boolean;
};

export const useContextRedirectionGuard = (
  organizations: Organization[],
): UseRedirectionGuardResult => {
  const selectedContextType = useSelectedContext();
  const subroute = useSubroute();
  const navigate = useNavigate();
  const [isContextRedirectionComplete, setIsContextRedirectionComplete] = useState<boolean>(false);

  if (selectedContextType !== SelectedContextType.None) {
    typedSessionStorage.setItem('dashboard::selectedContext', selectedContextType);
  }

  useEffect(() => {
    const dashboardRoute: DashboardRoute = {
      selectedContextType,
      subroute,
    };
    handleContextRedirection(dashboardRoute, organizations, navigate);
    setIsContextRedirectionComplete(true);
  }, [selectedContextType, organizations, navigate, subroute]);

  return {
    isRedirectionComplete: isContextRedirectionComplete,
  };
};

const handleContextRedirection = (
  dashboardRoute: DashboardRoute,
  organizations: Organization[],
  navigate: NavigateFunction,
): void => {
  const { selectedContextType, subroute } = dashboardRoute;
  if (!hasAccessToTargetContext(selectedContextType, organizations)) {
    navigateToSelf(subroute, navigate);
  } else {
    navigateToDifferentContext(dashboardRoute, navigate);
  }
};

const hasAccessToTargetContext = (
  selectedContextType: string,
  organizations: Organization[],
): boolean => hasAccessToContext(getTargetContext(selectedContextType), organizations);

const hasAccessToContext = (
  targetContext: SelectedContextType | string,
  organizations: Organization[],
): boolean =>
  organizations &&
  userHasAccessToSelectedContext({ selectedContext: targetContext, orgs: organizations });

const getTargetContext = (
  currentContext: SelectedContextType | string,
): SelectedContextType | string =>
  currentContext === SelectedContextType.None ? getSelectedContextFromStorage() : currentContext;

const getSelectedContextFromStorage = (): string => {
  return typedSessionStorage.getItem('dashboard::selectedContext') || SelectedContextType.Self;
};

const navigateToSelf = (subroute: string, navigate: NavigateFunction): void => {
  const dashboardRoute: DashboardRoute = {
    selectedContextType: SelectedContextType.Self,
    subroute,
  };
  navigateToContext(dashboardRoute, navigate);
};

const navigateToContext = (
  { subroute, selectedContextType }: DashboardRoute,
  navigate: NavigateFunction,
): void => navigate(subroute + '/' + selectedContextType + location.search, { replace: true });

const navigateToDifferentContext = (
  { subroute, selectedContextType }: DashboardRoute,
  navigate: NavigateFunction,
): void => {
  if (isTargetContextDifferent(selectedContextType)) {
    const dashboardRoute: DashboardRoute = {
      selectedContextType: getTargetContext(selectedContextType),
      subroute,
    };
    navigateToContext(dashboardRoute, navigate);
  }
};

const isTargetContextDifferent = (selectedContextType: string): boolean =>
  getTargetContext(selectedContextType) !== selectedContextType;

type DashboardRoute = {
  selectedContextType: string;
  subroute: string;
};
