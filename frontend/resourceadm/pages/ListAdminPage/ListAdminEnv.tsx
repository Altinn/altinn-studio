import React, { useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { StudioSpinner } from '@studio/components';
import { useGetPartyListsQuery } from 'resourceadm/hooks/queries/useGetPartyLists';
import { Button } from '@digdir/design-system-react';
import { NewPartyListModal } from '../../components/NewPartyListModal/NewPartyListModal';
import { getPartyListPageUrl } from 'resourceadm/utils/urlUtils/urlUtils';

export const ListAdminEnv = (): React.ReactNode => {
  const { selectedContext, env } = useParams();
  const repo = `${selectedContext}-resources`;
  const { data: envListData, isLoading: isLoadingEnvListData } = useGetPartyListsQuery(
    selectedContext,
    env,
  );

  const navigate = useNavigate();
  const createPartyListModalRef = useRef<HTMLDialogElement>(null);

  return (
    <div>
      <NewPartyListModal
        ref={createPartyListModalRef}
        org={selectedContext}
        env={env}
        onClose={() => createPartyListModalRef.current?.close()}
        onPartyListCreated={(identifier: string) => {
          createPartyListModalRef.current?.close();
          navigate(getPartyListPageUrl(selectedContext, repo, env, identifier));
        }}
      />
      {isLoadingEnvListData && <StudioSpinner />}
      {!!envListData &&
        envListData.map((x) => {
          return (
            <div key={x.identifier}>
              <Link to={getPartyListPageUrl(selectedContext, repo, env, x.identifier)}>
                {x.name}
              </Link>
            </div>
          );
        })}
      <Button onClick={() => createPartyListModalRef.current?.showModal()}>Opprett ny liste</Button>
    </div>
  );
};
