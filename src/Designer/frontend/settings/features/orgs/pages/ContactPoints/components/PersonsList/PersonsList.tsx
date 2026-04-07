import { useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioTable, StudioSwitch, StudioHeading, StudioParagraph } from '@studio/components';
import { EnvironmentsCell } from '../EnvironmentsCell/EnvironmentsCell';
import { ActionsCell } from '../ActionsCell/ActionsCell';
import type { ContactPoint } from 'app-shared/types/ContactPoint';
import { PersonDialog } from './PersonDialog/PersonDialog';
import type { Person } from './PersonDialog/PersonDialog';
import { contactPointToPerson } from './personUtils';
import { useToggleContactPointActiveMutation } from '../../../../hooks/useToggleContactPointActiveMutation';
import { useDeleteContactPointMutation } from '../../../../hooks/useDeleteContactPointMutation';
import { useOrgListQuery } from 'app-shared/hooks/queries/useOrgListQuery';
import { AddButton } from '../AddButton/AddButton';

type PersonsListProps = {
  org: string;
  persons: ContactPoint[];
};

const createEmptyPerson = (availableEnvironments: string[]): Person => ({
  name: '',
  email: '',
  phone: '',
  isActive: true,
  environments: availableEnvironments,
});

export const PersonsList = ({ org, persons }: PersonsListProps): ReactElement => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [initialValue, setInitialValue] = useState<Person>(createEmptyPerson([]));
  const [editingId, setEditingId] = useState<string | null>(null);

  const { mutate: toggleActive } = useToggleContactPointActiveMutation(org);
  const { mutate: deletePerson } = useDeleteContactPointMutation(org);

  const { data: orgs } = useOrgListQuery();
  const availableEnvironments = orgs?.[org]?.environments ?? [];

  const openAddDialog = () => {
    setInitialValue(createEmptyPerson(availableEnvironments));
    setEditingId(null);
    setIsOpen(true);
  };

  const openEditDialog = (person: ContactPoint) => {
    setInitialValue(contactPointToPerson(person));
    setEditingId(person.id);
    setIsOpen(true);
  };

  const handleToggleActive = (person: ContactPoint) => {
    toggleActive({ id: person.id, isActive: !person.isActive });
  };

  return (
    <>
      <StudioHeading level={3}>{t('settings.orgs.contact_points.persons_heading')}</StudioHeading>
      <StudioParagraph>{t('settings.orgs.contact_points.persons_description')}</StudioParagraph>
      <StudioTable>
        <StudioTable.Head>
          <StudioTable.Row>
            <StudioTable.HeaderCell>
              {t('settings.orgs.contact_points.col_active')}
            </StudioTable.HeaderCell>
            <StudioTable.HeaderCell>
              {t('settings.orgs.contact_points.col_name')}
            </StudioTable.HeaderCell>
            <StudioTable.HeaderCell>
              {t('settings.orgs.contact_points.col_email')}
            </StudioTable.HeaderCell>
            <StudioTable.HeaderCell>
              {t('settings.orgs.contact_points.col_sms')}
            </StudioTable.HeaderCell>
            <StudioTable.HeaderCell>
              {t('settings.orgs.contact_points.col_environments')}
            </StudioTable.HeaderCell>
            <StudioTable.HeaderCell />
          </StudioTable.Row>
        </StudioTable.Head>
        <StudioTable.Body>
          {persons.map((person) => {
            const email = person.methods.find((m) => m.methodType === 'email')?.value;
            const phone = person.methods.find((m) => m.methodType === 'sms')?.value;
            return (
              <StudioTable.Row key={person.id}>
                <StudioTable.Cell>
                  <StudioSwitch
                    checked={person.isActive}
                    onChange={() => handleToggleActive(person)}
                    aria-label={person.name}
                  />
                </StudioTable.Cell>
                <StudioTable.Cell>{person.name}</StudioTable.Cell>
                <StudioTable.Cell>{email}</StudioTable.Cell>
                <StudioTable.Cell>{phone}</StudioTable.Cell>
                <EnvironmentsCell environments={person.environments} />
                <ActionsCell
                  onEdit={() => openEditDialog(person)}
                  onDelete={() => deletePerson(person.id)}
                  editAriaLabel={t('settings.orgs.contact_points.dialog_edit_person_title')}
                  itemName={person.name}
                />
              </StudioTable.Row>
            );
          })}
        </StudioTable.Body>
      </StudioTable>
      <AddButton onClick={openAddDialog}>{t('settings.orgs.contact_points.add_contact')}</AddButton>
      {isOpen && (
        <PersonDialog
          initialValue={initialValue}
          availableEnvironments={availableEnvironments}
          org={org}
          editingId={editingId}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
};
