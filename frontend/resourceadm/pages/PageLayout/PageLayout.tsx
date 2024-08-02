import React, { useEffect, useMemo } from 'react';
import classes from './PageLayout.module.css';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import AppHeader, {
  HeaderContext,
  SelectedContextType,
} from 'app-shared/navigation/main-header/Header';
import type { IHeaderContext } from 'app-shared/navigation/main-header/Header';

import { userHasAccessToOrganization } from '../../utils/userUtils';
import { useOrganizationsQuery } from '../../hooks/queries';
import { useUserQuery } from 'app-shared/hooks/queries';
import { GiteaHeader } from 'app-shared/components/GiteaHeader';
import { useUrlParams } from '../../hooks/useUrlParams';
import { StudioPageSpinner } from '@studio/components';
import { ErrorMessage } from '../../components/ErrorMessage';
import { useTranslation } from 'react-i18next';

/**
 * @component
 *    The layout of each page, including the header and the Gitea header
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const PageLayout = (): React.JSX.Element => {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const { data: user, isPending: isUserPending, isError: isUserError } = useUserQuery();
  const {
    data: organizations,
    isPending: isOrganizationsPending,
    isError: isOrganizationsError,
  } = useOrganizationsQuery();

  const { org = SelectedContextType.Self } = useUrlParams();

  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    if (organizations && !userHasAccessToOrganization({ org, orgs: organizations })) {
      navigate('/');
    }
  }, [organizations, org, user.login, navigate]);

  const headerContextValue: IHeaderContext = useMemo(
    () => ({
      selectableOrgs: organizations,
      user,
    }),
    [organizations, user],
  );

  const componentIsPending = isUserPending || isOrganizationsPending;
  if (componentIsPending) {
    return (
      <StudioPageSpinner showSpinnerTitle={false} spinnerTitle={t('resourceadm.loading_app')} />
    );
  }

  if (isUserError || isOrganizationsError) {
    return (
      <div>
        {isUserError && (
          <ErrorMessage
            title={t('resourceadm.dashboard_userdata_error_header')}
            message={t('resourceadm.dashboard_userdata_error_body')}
          />
        )}
        {isOrganizationsError && (
          <ErrorMessage
            title={t('resourceadm.dashboard_organizationdata_error_header')}
            message={t('resourceadm.dashboard_organizationdata_error_body')}
          />
        )}
      </div>
    );
  }

  return (
    <div className={classes.root}>
      <HeaderContext.Provider value={headerContextValue}>
        {/* TODO - Find out if <AppHeader /> should be replaced to be the same as studio */}
        <AppHeader />
        <GiteaHeader menuOnlyHasRepository rightContentClassName={classes.extraPadding} />
      </HeaderContext.Provider>
      <Outlet />
    </div>
  );
};
