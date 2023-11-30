import { Button, Heading } from '@digdir/design-system-react';
import React, { useState } from 'react';
import { OrganizationAccessPage } from './OrganizationAccessPage';
import { OrganizationListActions } from './OrganizationListActions';
import { TestLister, ListConnections } from './listeTestData';
import { ResourceList } from 'app-shared/types/ResourceAdm';

interface OrganizationListPageProps {
  env: string;
  resourceId: string;
  onBack: () => void;
}

export const OrganizationListPage = ({
  env,
  resourceId,
  onBack,
}: OrganizationListPageProps): React.ReactNode => {
  const [isCreatingList, setIsCreatingList] = useState<boolean>(false);

  const connectedLists = ListConnections.filter(
    (x) => x.resourceId === resourceId && x.env === env,
  );

  const [selectedLists, setSelectedLists] = useState<ResourceList[]>(connectedLists);

  const filterAvailableLists = () => {
    return TestLister.filter((z) => {
      const usedLists = selectedLists.map((x) => x.listId);
      return z.env === env && usedLists.indexOf(z.id) === -1;
    }).map((z) => {
      return {
        value: `${z.id}`,
        label: z.title,
      };
    });
  };

  const handleSave = (listItem: ResourceList, diff: Partial<ResourceList>) => {
    const saveItem = { ...listItem, ...diff };
    // call service to save
    console.log('SAVE', saveItem);
    // update state
    setSelectedLists((old) => old.map((y) => (y.listId === listItem.listId ? saveItem : y)));
  };

  const handleDelete = (listItemId: number) => {
    setSelectedLists((old) => old.filter((y) => y.listId !== listItemId));
    console.log('DELETE', listItemId); // do not delete when listItemId is 0, just remove from state
  };

  const handleAdd = (listItem: ResourceList) => {
    console.log('ADD', listItem);
    setSelectedLists((old) => [...old, listItem]);
  };

  if (isCreatingList) {
    return (
      <div>
        <Button size='small' variant='tertiary' onClick={() => setIsCreatingList(false)}>
          Tilbake
        </Button>
        <OrganizationAccessPage
          list={{
            env: env,
            id: 0,
            title: 'Ny liste',
            members: [],
          }}
          onDeleted={() => setIsCreatingList(false)}
        />
      </div>
    );
  }

  return (
    <div style={{ width: '100%', margin: '1rem' }}>
      <Button variant='tertiary' onClick={onBack}>
        Tilbake
      </Button>
      <Heading level={1} size='large'>{`Konfigurer RRR for ${resourceId} - ${env}`}</Heading>
      {selectedLists.map((x) => {
        return (
          <OrganizationListActions
            key={x.listId}
            listName={TestLister.find((y) => y.id === x.listId)?.title}
            listItem={x}
            listOptions={filterAvailableLists()}
            onRemove={(listIdToRemove: number) => {
              handleDelete(listIdToRemove);
            }}
            onChange={(listItem: ResourceList, diff: Partial<ResourceList>) => {
              handleSave(listItem, diff);
            }}
          />
        );
      })}
      <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', marginTop: '1rem' }}>
        <Button
          disabled={selectedLists.some((x) => !x.listId)}
          onClick={() =>
            handleAdd({
              resourceId: resourceId,
              env: env,
              listId: 0,
              actions: [],
            })
          }
        >
          Legg til liste
        </Button>
        <Button variant='secondary' onClick={() => setIsCreatingList(true)}>
          Opprett ny liste
        </Button>
      </div>
    </div>
  );
};
