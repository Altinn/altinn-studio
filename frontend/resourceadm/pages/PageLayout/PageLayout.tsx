import React, { useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { userHasAccessToOrganization } from '../../utils/userUtils';
import { useOrganizationsQuery } from '../../hooks/queries';
import { useRepoStatusQuery, useUserQuery } from 'app-shared/hooks/queries';
import { useUrlParams } from '../../hooks/useUrlParams';
import postMessages from 'app-shared/utils/postMessages';
import { MergeConflictModal } from '../../components/MergeConflictModal';
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
  const mergeConflictModalRef = useRef<HTMLDialogElement>(null);

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
      mergeConflictModalRef.current.showModal();
    }
  }, [repoStatus?.hasMergeConflict]);

  useEffect(() => {
    const windowEventReceived = async (event: any) => {
      if (
        event.origin === window.location.origin &&
        event.data === postMessages.forceRepoStatusCheck
      ) {
        mergeConflictModalRef.current.showModal();
      }
    };

    window.addEventListener('message', windowEventReceived);
    return function cleanup() {
      window.removeEventListener('message', windowEventReceived);
    };
  }, [mergeConflictModalRef]);

  return (
    <>
      <MergeConflictModal ref={mergeConflictModalRef} org={org} repo={app} />
      {organizations && user && <ResourceAdmHeader organizations={organizations} user={user} />}
      <Outlet />
    </>
  );
};
