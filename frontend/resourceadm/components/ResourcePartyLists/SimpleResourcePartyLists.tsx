import React, { useEffect, useState, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Alert, Button, Checkbox, Heading, Link as DigdirLink } from '@digdir/design-system-react';
import { useGetPartyListsQuery } from 'resourceadm/hooks/queries/useGetPartyLists';
import { StudioSpinner } from '@studio/components';
import { useGetResourcePartyListsQuery } from 'resourceadm/hooks/queries/useGetResourcePartyLists';
import { useAddResourcePartyListMutation } from 'resourceadm/hooks/mutations/useAddResourcePartyListMutation';
import { useRemoveResourcePartyListMutation } from 'resourceadm/hooks/mutations/useRemoveResourcePartyListMutation';
import { getResourcePageURL } from 'resourceadm/utils/urlUtils';
import { NewPartyListModal } from '../NewPartyListModal/NewPartyListModal';

interface SimpleResourcePartyListsProps {
  env: string;
  resourceId: string;
}

export const SimpleResourcePartyLists = ({
  env,
  resourceId,
}: SimpleResourcePartyListsProps): React.ReactNode => {
  const { selectedContext } = useParams();
  const repo = `${selectedContext}-resources`;
  const navigate = useNavigate();
  const createPartyListModalRef = useRef<HTMLDialogElement>(null);

  const [selectedLists, setSelectedLists] = useState<string[]>([]);

  const {
    data: envListData,
    isLoading: isLoadingEnvListData,
    error: envListDataError,
  } = useGetPartyListsQuery(selectedContext, env);
  const {
    data: connectedLists,
    isLoading: isLoadingConnectedLists,
    error: connectedListsError,
  } = useGetResourcePartyListsQuery(selectedContext, resourceId, env);
  const { mutate: addResourcePartyList } = useAddResourcePartyListMutation(
    selectedContext,
    resourceId,
    env,
  );
  const { mutate: removeResourcePartyList } = useRemoveResourcePartyListMutation(
    selectedContext,
    resourceId,
    env,
  );

  useEffect(() => {
    if (connectedLists) {
      setSelectedLists(connectedLists.map((x) => x.partyListIdentifier));
    }
  }, [connectedLists]);

  const handleRemove = (listItemId: string) => {
    setSelectedLists((old) => old.filter((y) => y !== listItemId));
    removeResourcePartyList(listItemId);
    console.log('DELETE', listItemId);
  };

  const handleAdd = (listItemId: string) => {
    console.log('ADD', listItemId);
    addResourcePartyList(listItemId);
    setSelectedLists((old) => [...old, listItemId]);
  };

  if (isLoadingEnvListData || isLoadingConnectedLists) {
    return <StudioSpinner />;
  }

  if (envListDataError || connectedListsError) {
    return <Alert severity='danger'>Kunne ikke laste lister</Alert>;
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '1rem',
        margin: '1rem',
      }}
    >
      <NewPartyListModal
        ref={createPartyListModalRef}
        org={selectedContext}
        env={env}
        onClose={() => createPartyListModalRef.current?.close()}
        onPartyListCreated={(identifier: string) => {
          createPartyListModalRef.current?.close();
          navigate(
            `${getResourcePageURL(
              selectedContext,
              repo,
              resourceId,
              'partylists',
            )}/${env}/${identifier}`,
          );
        }}
      />
      <DigdirLink as={Link} to={getResourcePageURL(selectedContext, repo, resourceId, 'about')}>
        Tilbake
      </DigdirLink>
      <Heading level={1} size='large'>{`Konfigurer RRR for ${resourceId} - ${env}`}</Heading>
      <Checkbox.Group
        legend='Velg hvilke lister som skal ha tilgang til ressursen'
        size='small'
        onChange={(newValues: string[]) => {
          if (selectedLists.length < newValues.length) {
            // list was added
            const addedListIdentifier = newValues[newValues.length - 1];
            handleAdd(addedListIdentifier);
          } else {
            const removedListIdentifier = selectedLists.find((x) => newValues.indexOf(x) === -1);
            handleRemove(removedListIdentifier);
          }
        }}
        value={selectedLists}
      >
        {envListData.map((list) => {
          return (
            <div
              key={list.identifier}
              style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1rem' }}
            >
              <Checkbox value={list.identifier}>{list.name}</Checkbox>
              <DigdirLink
                as={Link}
                to={`${getResourcePageURL(
                  selectedContext,
                  repo,
                  resourceId,
                  'partylists',
                )}/${env}/${list.identifier}`}
              >
                (endre)
              </DigdirLink>
            </div>
          );
        })}
      </Checkbox.Group>
      <Button variant='secondary' onClick={() => createPartyListModalRef.current?.showModal()}>
        Opprett ny liste
      </Button>
    </div>
  );
};
