import { Button, Card, Chip, Heading, Select } from '@digdir/design-system-react';
import React from 'react';
import { FieldWrapper } from '../FieldWrapper/FieldWrapper';
import { PartyListResourceLink } from 'app-shared/types/ResourceAdm';

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

interface ResourcePartyListActionsProps {
  listItem: PartyListResourceLink;
  onRemove: (listId: string) => void;
  onChange: (listItem: PartyListResourceLink, diff: Partial<PartyListResourceLink>) => void;
}

export const ResourcePartyListActions = ({
  listItem,
  onRemove,
  onChange,
}: ResourcePartyListActionsProps): React.ReactNode => {
  return (
    <Card style={{ margin: '1rem 0', maxWidth: '40rem' }}>
      <Card.Header
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          backgroundColor: '#e1e1e1',
        }}
      >
        <Heading level={2} size='small' spacing>
          {listItem.partyListName}
        </Heading>
        <Button
          color='danger'
          size='small'
          variant='secondary'
          onClick={() => onRemove(listItem.partyListIdentifier)}
        >
          Fjern fra ressurs
        </Button>
      </Card.Header>
      <Card.Content style={{ padding: '1rem 1.5rem' }}>
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
      </Card.Content>
    </Card>
  );
};
