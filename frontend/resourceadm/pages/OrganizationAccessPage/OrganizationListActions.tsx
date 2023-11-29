import { Accordion, Button, Chip, Heading, Paragraph, Select } from '@digdir/design-system-react';
import React, { useState } from 'react';
import { FieldWrapper } from './FieldWrapper';

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

interface ListItem {
  listName: string;
  resourceId: string;
  env: string;
  list: number;
  actions: string[];
}

interface OrganizationListActionsProps {
  listItem: ListItem;
  listOptions: { value: string; label: string }[];
  onRemove: (listId: number) => void;
  onChange: (listItem: ListItem, diff: Partial<ListItem>) => void;
}

export const OrganizationListActions = ({
  listItem,
  listOptions,
  onRemove,
  onChange,
}: OrganizationListActionsProps): React.ReactNode => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        backgroundColor: '#eee',
        marginBottom: '2rem',
        padding: '1.5rem',
        borderRadius: '8px',
        maxWidth: '50%',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '1rem',
          alignItems: 'flex-end',
        }}
      >
        <div style={{ flex: 1 }}>
          <FieldWrapper label='Liste'>
            {listItem.list ? (
              <Heading level={2} size='small'>
                {listItem.listName}
              </Heading>
            ) : (
              <Select
                options={listOptions}
                value={`${listItem.list}`}
                disabled={!!listItem.list}
                onChange={(value: string) => {
                  onChange(listItem, {
                    list: parseInt(value),
                    listName: listOptions.find((x) => x.value === value).label,
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
          onClick={() => onRemove(listItem.list)}
        >
          Fjern fra ressurs
        </Button>
      </div>
      <div>
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
