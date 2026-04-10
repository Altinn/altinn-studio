import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { userHasAccessToOrganization } from '../../utils/userUtils';
import { useOrganizationsQuery } from '../../hooks/queries';
import { useRepoStatusQuery } from 'app-shared/hooks/queries';
import { useUrlParams } from '../../hooks/useUrlParams';
import postMessages from 'app-shared/utils/postMessages';
import { MergeConflict } from '../../components/MergeConflict';
import { GiteaHeader } from 'app-shared/components/GiteaHeader';
import { StudioPageLayout } from 'app-shared/components';
import { getAppName } from '../../utils/stringUtils';

/**
 * @component
 *    The layout of each page, including the header and the Gitea header
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const PageLayout = (): React.JSX.Element => {
  const { pathname } = useLocation();
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

  const onSelectAccount = (id: string) => {
    navigate(`/${id}/${getAppName(id)}`);
  };

  return (
    <StudioPageLayout
      currentAccountId={org}
      onSelectAccount={onSelectAccount}
      fullScreen={true}
      hideBreadcrumbs={true}
    >
      <div data-color-scheme='dark'>
        <GiteaHeader menuOnlyHasRepository owner={org} repoName={app} />
      </div>
      {hasMergeConflict ? <MergeConflict org={org} repo={app} /> : <Outlet />}
    </StudioPageLayout>
  );
};
