import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { userHasAccessToOrganization } from '../../utils/userUtils';
import { useOrganizationsQuery } from '../../hooks/queries';
import { useRepoStatusQuery, useUserQuery } from 'app-shared/hooks/queries';
import { useUrlParams } from '../../hooks/useUrlParams';
import postMessages from 'app-shared/utils/postMessages';
import { MergeConflict } from '../../components/MergeConflict';
import { ResourceAdmHeader } from '../../components/ResourceAdmHeader';

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
  const [hasMergeConflict, setHasMergeConflict] = useState(false);

  const { org, app } = useUrlParams();
  const { data: repoStatus } = useRepoStatusQuery(org, app);

  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    if (organizations && !userHasAccessToOrganization({ org, orgs: organizations })) {
      navigate('/');
    }
  }, [organizations, org, navigate]);

  useEffect(() => {
    if (repoStatus?.hasMergeConflict) {
      setHasMergeConflict(true);
    }
  }, [repoStatus?.hasMergeConflict]);

  useEffect(() => {
    const windowEventReceived = async (event: any) => {
      if (
        event.origin === window.location.origin &&
        event.data === postMessages.forceRepoStatusCheck
      ) {
        setHasMergeConflict(true);
      }
    };

    window.addEventListener('message', windowEventReceived);
    return function cleanup() {
      window.removeEventListener('message', windowEventReceived);
    };
  }, []);

  return (
    <>
      {organizations && user && <ResourceAdmHeader organizations={organizations} user={user} />}
      {hasMergeConflict ? <MergeConflict org={org} repo={app} /> : <Outlet />}
    </>
  );
};
