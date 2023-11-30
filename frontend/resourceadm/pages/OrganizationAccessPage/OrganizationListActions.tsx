import { Button, Chip, Heading, Select } from '@digdir/design-system-react';
import React from 'react';
import { FieldWrapper } from './FieldWrapper';
import { ResourceList } from 'app-shared/types/ResourceAdm';

const actionOptions = [
  {
    value: 'read',
    label: 'Les',
  },
  {
    value: 'write',
    label: 'Skriv',
  },
  {
    value: 'sign',
    label: 'Signer',
  },
  {
    value: 'instansiate',
    label: 'Instansier',
  },
];

interface OrganizationListActionsProps {
  listItem: ResourceList;
  listName: string;
  listOptions: { value: string; label: string }[];
  onRemove: (listId: number) => void;
  onChange: (listItem: ResourceList, diff: Partial<ResourceList>) => void;
}

export const OrganizationListActions = ({
  listItem,
  listName,
  listOptions,
  onRemove,
  onChange,
}: OrganizationListActionsProps): React.ReactNode => {
  return (
    <div
      style={{
        marginBottom: '4rem',
        borderRadius: '8px',
        maxWidth: '50%',
        border: '2px solid #ddd',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '1rem',
          alignItems: 'flex-end',
          padding: '1rem 1.5rem',
          borderBottom: '2px solid #ddd',
        }}
      >
        <div style={{ flex: 1 }}>
          <FieldWrapper label='Liste'>
            {listItem.listId ? (
              <Heading level={2} size='small'>
                {listName}
              </Heading>
            ) : (
              <Select
                options={listOptions}
                value={`${listItem.listId}`}
                disabled={!!listItem.listId}
                onChange={(value: string) => {
                  onChange(listItem, {
                    listId: parseInt(value),
                  });
                }}
              />
            )}
          </FieldWrapper>
        </div>
        <Button
          color='danger'
          size='small'
          variant='secondary'
          onClick={() => onRemove(listItem.listId)}
        >
          Fjern fra ressurs
        </Button>
      </div>
      <div style={{ padding: '1rem 1.5rem' }}>
        <FieldWrapper
          label='Rettigheter'
          description='Legg til hvilke rettigheter som kreves for å bruke denne ressursen'
        >
          <Select
            options={actionOptions.filter((x) => listItem.actions.indexOf(x.value) === -1)}
            onChange={(value: string) =>
              value !== null && onChange(listItem, { actions: [...listItem.actions, value] })
            }
            disabled={actionOptions.length === 0}
          />
          <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
            {listItem.actions.map((x) => {
              return (
                <Chip.Removable
                  key={x}
                  aria-label={`remove`}
                  size='small'
                  onClick={() =>
                    onChange(listItem, { actions: listItem.actions.filter((y) => y !== x) })
                  }
                >
                  {actionOptions.find((y) => y.value === x).label}
                </Chip.Removable>
              );
            })}
          </div>
        </FieldWrapper>
      </div>
    </div>
  );
};
