import { useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioTable,
  StudioButton,
  StudioSwitch,
  StudioHeading,
  StudioParagraph,
  StudioDeleteButton,
  StudioTag,
} from '@studio/components';
import type { ContactPoint, ContactPointPayload } from 'app-shared/types/ContactPoint';
import { PersonDialog } from './PersonDialog/PersonDialog';
import type { Person } from './PersonDialog/PersonDialog';
import { useAddContactPointMutation } from 'admin/features/settings/hooks/useAddContactPointMutation';
import { useUpdateContactPointMutation } from 'admin/features/settings/hooks/useUpdateContactPointMutation';
import { useToggleContactPointActiveMutation } from 'admin/features/settings/hooks/useToggleContactPointActiveMutation';
import { useDeleteContactPointMutation } from 'admin/features/settings/hooks/useDeleteContactPointMutation';
import { useOrgListQuery } from 'app-shared/hooks/queries/useOrgListQuery';
import { PlusIcon, StudioEditIcon } from '@studio/icons';
import classes from './PersonsList.module.css';

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

const personToPayload = (person: Person): ContactPointPayload => ({
  name: person.name,
  isActive: person.isActive,
  environments: person.environments,
  methods: [
    ...(person.email ? [{ methodType: 'email' as const, value: person.email }] : []),
    ...(person.phone ? [{ methodType: 'sms' as const, value: person.phone }] : []),
  ],
});

const contactPointToPerson = (cp: ContactPoint): Person => ({
  name: cp.name,
  isActive: cp.isActive,
  environments: cp.environments,
  email: cp.methods.find((m) => m.methodType === 'email')?.value ?? '',
  phone: cp.methods.find((m) => m.methodType === 'sms')?.value ?? '',
});

export const PersonsList = ({ org, persons }: PersonsListProps): ReactElement => {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [personForm, setPersonForm] = useState<Person>(createEmptyPerson([]));
  const [editingId, setEditingId] = useState<string | null>(null);

  const { mutate: addPerson, isPending: isAdding } = useAddContactPointMutation(org);
  const { mutate: updatePerson, isPending: isUpdating } = useUpdateContactPointMutation(org);
  const { mutate: toggleActive } = useToggleContactPointActiveMutation(org);
  const { mutate: deletePerson } = useDeleteContactPointMutation(org);

  const { data: orgs } = useOrgListQuery();
  const availableEnvironments = orgs?.[org]?.environments ?? [];

  const isSaving = isAdding || isUpdating;

  const openAddDialog = () => {
    setPersonForm(createEmptyPerson(availableEnvironments));
    setEditingId(null);
    dialogRef.current?.showModal();
  };

  const openEditDialog = (person: ContactPoint) => {
    setPersonForm(contactPointToPerson(person));
    setEditingId(person.id);
    dialogRef.current?.showModal();
  };

  const closeDialog = () => {
    dialogRef.current?.close();
  };

  const handleFieldChange = (field: keyof Person, value: string | boolean | string[]) => {
    setPersonForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const payload = personToPayload(personForm);
    if (editingId) {
      updatePerson({ id: editingId, payload }, { onSuccess: closeDialog });
    } else {
      addPerson(payload, { onSuccess: closeDialog });
    }
  };

  const handleToggleActive = (person: ContactPoint) => {
    toggleActive({ id: person.id, isActive: !person.isActive });
  };

  return (
    <>
      <StudioHeading level={3}>{t('org.settings.contact_points.persons_heading')}</StudioHeading>
      <StudioParagraph>{t('org.settings.contact_points.persons_description')}</StudioParagraph>
      <StudioTable>
        <StudioTable.Head>
          <StudioTable.Row>
            <StudioTable.HeaderCell>
              {t('org.settings.contact_points.col_active')}
            </StudioTable.HeaderCell>
            <StudioTable.HeaderCell>
              {t('org.settings.contact_points.col_name')}
            </StudioTable.HeaderCell>
            <StudioTable.HeaderCell>
              {t('org.settings.contact_points.col_email')}
            </StudioTable.HeaderCell>
            <StudioTable.HeaderCell>
              {t('org.settings.contact_points.col_sms')}
            </StudioTable.HeaderCell>
            <StudioTable.HeaderCell>
              {t('org.settings.contact_points.col_environments')}
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
                <StudioTable.Cell>
                  <div className={classes.environmentsWrapper}>
                    {person.environments.map((env) => (
                      <StudioTag key={env}>{env}</StudioTag>
                    ))}
                  </div>
                </StudioTable.Cell>
                <StudioTable.Cell className={classes.actions}>
                  <StudioButton
                    variant='tertiary'
                    icon={<StudioEditIcon />}
                    onClick={() => openEditDialog(person)}
                    aria-label={t('org.settings.contact_points.dialog_edit_person_title')}
                  />
                  <StudioDeleteButton
                    onDelete={() => deletePerson(person.id)}
                    confirmMessage={t('org.settings.contact_points.delete_confirm')}
                  />
                </StudioTable.Cell>
              </StudioTable.Row>
            );
          })}
        </StudioTable.Body>
      </StudioTable>
      <div className={classes.addButtonWrapper}>
        <StudioButton
          variant='secondary'
          icon={<PlusIcon />}
          onClick={openAddDialog}
          className={classes.addButton}
        >
          {t('org.settings.contact_points.add_contact')}
        </StudioButton>
      </div>
      <PersonDialog
        dialogRef={dialogRef}
        person={personForm}
        availableEnvironments={availableEnvironments}
        onFieldChange={handleFieldChange}
        onSave={handleSave}
        onClose={closeDialog}
        isEditing={editingId !== null}
        isSaving={isSaving}
      />
    </>
  );
};
