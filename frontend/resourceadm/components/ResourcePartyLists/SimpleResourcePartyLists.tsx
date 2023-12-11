import { Alert, Button, Checkbox, Heading } from '@digdir/design-system-react';
import React, { useEffect, useState } from 'react';
import { useGetPartyListsQuery } from 'resourceadm/hooks/queries/useGetPartyLists';
import { useParams } from 'react-router-dom';
import { StudioSpinner } from '@studio/components';
import { useGetResourcePartyListsQuery } from 'resourceadm/hooks/queries/useGetResourcePartyLists';
import { useAddResourcePartyListMutation } from 'resourceadm/hooks/mutations/useAddResourcePartyListMutation';
import { useRemoveResourcePartyListMutation } from 'resourceadm/hooks/mutations/useRemoveResourcePartyListMutation';

interface SimpleResourcePartyListsProps {
  env: string;
  resourceId: string;
  onBack: () => void;
}

export const SimpleResourcePartyLists = ({
  env,
  resourceId,
  onBack,
}: SimpleResourcePartyListsProps): React.ReactNode => {
  const { selectedContext } = useParams();
  const [isCreatingList, setIsCreatingList] = useState<boolean>(false);
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

  if (isCreatingList) {
    return (
      <div>
        <Button size='small' variant='tertiary' onClick={() => setIsCreatingList(false)}>
          Tilbake
        </Button>
        <div>Her må det komme inn funksjonalitet for å lage nye lister</div>
      </div>
    );
  }

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
      <Button variant='tertiary' size='small' onClick={onBack}>
        Tilbake
      </Button>
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
            <Checkbox key={list.identifier} value={list.identifier}>
              {list.name}
            </Checkbox>
          );
        })}
      </Checkbox.Group>
      <Button variant='secondary' onClick={() => setIsCreatingList(true)}>
        Opprett ny liste
      </Button>
    </div>
  );
};
