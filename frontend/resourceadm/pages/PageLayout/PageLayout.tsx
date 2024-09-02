import React, { useEffect, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { userHasAccessToOrganization } from '../../utils/userUtils';
import { useOrganizationsQuery } from '../../hooks/queries';
import { useUserQuery } from 'app-shared/hooks/queries';
import { useUrlParams } from '../../hooks/useUrlParams';
import { SelectedContextType } from 'resourceadm/context/HeaderContext';
import { HeaderContext, type HeaderContextType } from 'resourceadm/context/HeaderContext';
import { ResourceadmHeader } from './ResourceadmHeader';

/**
 * @component
 *    The layout of each page, including the header and the Gitea header
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const PageLayout = (): React.JSX.Element => {
  const { pathname } = useLocation();
  const { data: user } = useUserQuery();
  const { data: organizations } = useOrganizationsQuery();

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

  const headerContextValue: HeaderContextType = useMemo(
    () => ({
      selectableOrgs: organizations,
      user,
    }),
    [organizations, user],
  );

  return (
    <>
      <HeaderContext.Provider value={headerContextValue}>
        <ResourceadmHeader />
      </HeaderContext.Provider>
      <Outlet />
    </>
  );
};
