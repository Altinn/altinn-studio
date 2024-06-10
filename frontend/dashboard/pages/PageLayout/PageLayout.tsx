import AppHeader, {
  HeaderContext,
  SelectedContextType,
} from 'app-shared/navigation/main-header/Header';
import { Outlet, useNavigate } from 'react-router-dom';
import type { NavigateFunction } from 'react-router-dom';
import { useOrganizationsQuery } from 'dashboard/hooks/queries';
import { useUserQuery } from 'app-shared/hooks/queries';
import React, { useEffect, useMemo, useState } from 'react';
import type { IHeaderContext } from 'app-shared/navigation/main-header/Header';
import { useTranslation } from 'react-i18next';

import { useSelectedContext } from 'dashboard/hooks/useSelectedContext';
import { typedSessionStorage } from 'app-shared/utils/webStorage';
import { StudioPageSpinner } from '@studio/components';
import type { Organization } from 'app-shared/types/Organization';
import { userHasAccessToSelectedContext } from 'dashboard/utils/userUtils';

export const PageLayout = () => {
  const { t } = useTranslation();
  const { data: user } = useUserQuery();
  const { data: organizations } = useOrganizationsQuery();

  const selectedContext = useSelectedContext();
  const navigate = useNavigate();
  const [isReady, setIsReady] = useState<boolean>(false);

  if (selectedContext !== SelectedContextType.None) {
    typedSessionStorage.setItem('dashboard::selectedContext', selectedContext);
  }

  useEffect(() => {
    handleRedirection(selectedContext, organizations, navigate);
    setIsReady(true);
  }, [selectedContext, organizations, navigate]);

  const headerContextValue: IHeaderContext = useMemo(
    () => ({
      selectableOrgs: organizations,
      user,
    }),
    [organizations, user],
  );

  if (!isReady) return <StudioPageSpinner spinnerTitle={t('dashboard.loading')} />;
  return (
    <>
      <HeaderContext.Provider value={headerContextValue}>
        <AppHeader />
      </HeaderContext.Provider>
      <Outlet />
    </>
  );
};

function handleRedirection(
  selectedContext: string,
  organizations: Organization[],
  navigate: NavigateFunction,
) {
  let navigateToContext = selectedContext;

  if (selectedContext === SelectedContextType.None) {
    navigateToContext =
      typedSessionStorage.getItem('dashboard::selectedContext') || SelectedContextType.Self;
  }

  if (
    organizations &&
    userHasAccessToSelectedContext({ selectedContext: navigateToContext, orgs: organizations })
  ) {
    if (navigateToContext !== selectedContext) {
      navigate(navigateToContext + location.search, { replace: true });
    }
  } else {
    navigate(SelectedContextType.Self, { replace: true });
  }
}
