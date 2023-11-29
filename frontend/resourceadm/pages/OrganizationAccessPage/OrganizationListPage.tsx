import { Button, Heading, Select } from '@digdir/design-system-react';
import React, { useState } from 'react';
import { OrganizationAccessPage } from './OrganizationAccessPage';
import { OrganizationListActions } from './OrganizationListActions';
import { TestLister, ListConnections } from './listeTestData';

interface OrganizationListPageProps {
  env: string;
  resourceId: string;
  onBack: () => void;
}

interface ListItem {
  listName: string;
  resourceId: string;
  env: string;
  list: number;
  actions: string[];
}

export const OrganizationListPage = ({
  env,
  resourceId,
  onBack,
}: OrganizationListPageProps): React.ReactNode => {
  const [isCreatingList, setIsCreatingList] = useState<boolean>(false);

  const connectedLists = ListConnections.filter(
    (x) => x.resourceId === resourceId && x.env === env,
  ).map((x) => {
    return {
      ...x,
      listName: TestLister.find((y) => y.id === x.list).navn,
    };
  });

  const [selectedLists, setSelectedLists] = useState(connectedLists);

  const filterAvailableLists = () => {
    return TestLister.filter((z) => {
      const usedLists = selectedLists.map((x) => x.list);
      return z.env === env && usedLists.indexOf(z.id) === -1;
    }).map((z) => {
      return {
        value: `${z.id}`,
        label: z.navn,
      };
    });
  };

  const handleSave = (listItem: ListItem, diff: Partial<ListItem>) => {
    const saveItem = { ...listItem, ...diff };
    // call service to save
    console.log('SAVE', saveItem);
    // update state
    setSelectedLists((old) => old.map((y) => (y.list === listItem.list ? saveItem : y)));
  };

  const handleDelete = (listItemId: number) => {
    setSelectedLists((old) => old.filter((y) => y.list !== listItemId));
    console.log('DELETE', listItemId);
  };

  const handleAdd = (listItem: ListItem) => {
    console.log('ADD', listItem);
    setSelectedLists((old) => [...old, listItem]);
  };

  if (isCreatingList) {
    return <OrganizationAccessPage id={0} env={env} onBack={() => setIsCreatingList(false)} />;
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
            key={x.list}
            listItem={x}
            listOptions={filterAvailableLists()}
            onRemove={(listIdToRemove: number) => {
              handleDelete(listIdToRemove);
            }}
            onChange={(listItem: ListItem, diff: Partial<ListItem>) => {
              handleSave(listItem, diff);
            }}
          />
        );
      })}
      <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', marginTop: '1rem' }}>
        <Button
          disabled={selectedLists.some((x) => !x.list)}
          onClick={() =>
            handleAdd({
              listName: '',
              resourceId: resourceId,
              env: env,
              list: 0,
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
