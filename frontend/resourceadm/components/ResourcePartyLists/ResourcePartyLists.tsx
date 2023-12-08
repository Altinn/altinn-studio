import { Alert, Button, Heading, Label, NativeSelect } from '@digdir/design-system-react';
import React, { useEffect, useState } from 'react';
import { ResourcePartyListActions } from './ResourcePartyListActions';
import { PartyListResourceLink } from 'app-shared/types/ResourceAdm';
import { useGetPartyListsQuery } from 'resourceadm/hooks/queries/useGetPartyLists';
import { useParams } from 'react-router-dom';
import { StudioSpinner } from '@studio/components';
import { useGetResourcePartyListsQuery } from 'resourceadm/hooks/queries/useGetResourcePartyLists';
import { useEditResourcePartyListMutation } from 'resourceadm/hooks/mutations/useEditResourcePartyListMutation';
import { useAddResourcePartyListMutation } from 'resourceadm/hooks/mutations/useAddResourcePartyListMutation';
import { useRemoveResourcePartyListMutation } from 'resourceadm/hooks/mutations/useRemoveResourcePartyListMutation';

interface ResourcePartyListsProps {
  env: string;
  resourceId: string;
  onBack: () => void;
}

export const ResourcePartyLists = ({
  env,
  resourceId,
  onBack,
}: ResourcePartyListsProps): React.ReactNode => {
  const { selectedContext } = useParams();
  const [isCreatingList, setIsCreatingList] = useState<boolean>(false);
  const [selectedAddList, setSelectedAddList] = useState<string>('');
  const [selectedLists, setSelectedLists] = useState<PartyListResourceLink[]>([]);

  // TODO loading: load all lists for environment, load connected lists for resource
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
  const { mutate: editResourcePartyList } = useEditResourcePartyListMutation(
    selectedContext,
    resourceId,
    env,
  );
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
      setSelectedLists(connectedLists);
    }
  }, [connectedLists]);

  const filterAvailableLists = () => {
    return envListData.filter((z) => {
      const usedLists = selectedLists.map((x) => x.partyListIdentifier);
      return usedLists.indexOf(z.identifier) === -1;
    });
  };

  const handleSave = (listItem: PartyListResourceLink, diff: Partial<PartyListResourceLink>) => {
    const saveItem = { ...listItem, ...diff };
    // call service to save
    console.log('SAVE', saveItem);
    editResourcePartyList({ listId: listItem.partyListIdentifier, actions: diff.actions });
    // update state
    setSelectedLists((old) =>
      old.map((y) => (y.partyListIdentifier === listItem.partyListIdentifier ? saveItem : y)),
    );
  };

  const handleDelete = (listItemId: string) => {
    setSelectedLists((old) => old.filter((y) => y.partyListIdentifier !== listItemId));
    removeResourcePartyList(listItemId);
    console.log('DELETE', listItemId); // do not delete when listItemId is 0, just remove from state
  };

  const handleAdd = (listItem: PartyListResourceLink) => {
    console.log('ADD', listItem);
    addResourcePartyList(listItem.partyListIdentifier);
    setSelectedLists((old) => [...old, listItem]);
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
    <div style={{ width: '100%', margin: '1rem' }}>
      <Button variant='tertiary' onClick={onBack}>
        Tilbake
      </Button>
      <Heading level={1} size='large'>{`Konfigurer RRR for ${resourceId} - ${env}`}</Heading>
      {selectedLists.map((x) => {
        return (
          <ResourcePartyListActions
            key={x.partyListIdentifier}
            listItem={x}
            onRemove={(listIdToRemove: string) => {
              handleDelete(listIdToRemove);
            }}
            onChange={(listItem: PartyListResourceLink, diff: Partial<PartyListResourceLink>) => {
              handleSave(listItem, diff);
            }}
          />
        );
      })}
      <Label size='small' htmlFor='addlist'>
        Legg til liste
      </Label>
      <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem' }}>
        <NativeSelect
          id='addlist'
          style={{ width: '20rem' }}
          value={selectedAddList}
          onChange={(event) => setSelectedAddList(event.target.value)}
        >
          <option value=''>{'<velg liste>'}</option>
          {filterAvailableLists().map((x) => {
            return (
              <option key={x.identifier} value={x.identifier}>
                {x.name}
              </option>
            );
          })}
        </NativeSelect>
        <Button
          disabled={!selectedAddList}
          onClick={() => {
            setSelectedAddList('');
            handleAdd({
              resourceIdentifier: resourceId,
              partyListName: envListData.find((list) => list.identifier === selectedAddList).name,
              partyListIdentifier: selectedAddList,
              actions: [],
            });
          }}
        >
          Legg til
        </Button>
        <Button variant='secondary' onClick={() => setIsCreatingList(true)}>
          Opprett ny liste
        </Button>
      </div>
    </div>
  );
};
