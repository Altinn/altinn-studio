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
} from '@studio/components';
import type { ContactPoint, ContactPointPayload } from 'app-shared/types/ContactPoint';
import { PersonDialog } from './PersonDialog/PersonDialog';
import { useAddContactPointMutation } from 'admin/features/settings/hooks/useAddContactPointMutation';
import { useUpdateContactPointMutation } from 'admin/features/settings/hooks/useUpdateContactPointMutation';
import { useToggleContactPointActiveMutation } from 'admin/features/settings/hooks/useToggleContactPointActiveMutation';
import { useDeleteContactPointMutation } from 'admin/features/settings/hooks/useDeleteContactPointMutation';
import { PlusIcon, StudioEditIcon } from '@studio/icons';
import classes from './PersonsList.module.css';

type PersonDraft = {
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
};

type PersonsListProps = {
  org: string;
  persons: ContactPoint[];
};

const emptyDraft = (): PersonDraft => ({ name: '', email: '', phone: '', isActive: true });

const draftToPayload = (draft: PersonDraft): ContactPointPayload => ({
  name: draft.name,
  isActive: draft.isActive,
  methods: [
    ...(draft.email ? [{ methodType: 'email' as const, value: draft.email }] : []),
    ...(draft.phone ? [{ methodType: 'sms' as const, value: draft.phone }] : []),
  ],
});

const contactPointToDraft = (cp: ContactPoint): PersonDraft => ({
  name: cp.name,
  isActive: cp.isActive,
  email: cp.methods.find((m) => m.methodType === 'email')?.value ?? '',
  phone: cp.methods.find((m) => m.methodType === 'sms')?.value ?? '',
});

export const PersonsList = ({ org, persons }: PersonsListProps): ReactElement => {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<PersonDraft>(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);

  const { mutate: addPerson, isPending: isAdding } = useAddContactPointMutation(org);
  const { mutate: updatePerson, isPending: isUpdating } = useUpdateContactPointMutation(org);
  const { mutate: toggleActive } = useToggleContactPointActiveMutation(org);
  const { mutate: deletePerson } = useDeleteContactPointMutation(org);

  const isSaving = isAdding || isUpdating;

  const openAddDialog = () => {
    setDraft(emptyDraft());
    setEditingId(null);
    dialogRef.current?.showModal();
  };

  const openEditDialog = (person: ContactPoint) => {
    setDraft(contactPointToDraft(person));
    setEditingId(person.id);
    dialogRef.current?.showModal();
  };

  const closeDialog = () => {
    dialogRef.current?.close();
  };

  const handleFieldChange = (field: keyof PersonDraft, value: string | boolean) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const payload = draftToPayload(draft);
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
      <StudioHeading level={3} data-size='sm'>
        {t('org.settings.contact_points.persons_heading')}
      </StudioHeading>
      <StudioParagraph data-size='sm'>
        {t('org.settings.contact_points.persons_description')}
      </StudioParagraph>
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
            <StudioTable.HeaderCell />
          </StudioTable.Row>
        </StudioTable.Head>
        <StudioTable.Body>
          {persons.map((person) => (
            <StudioTable.Row key={person.id}>
              <StudioTable.Cell>
                <StudioSwitch
                  checked={person.isActive}
                  onChange={() => handleToggleActive(person)}
                  aria-label={person.name}
                />
              </StudioTable.Cell>
              <StudioTable.Cell>{person.name}</StudioTable.Cell>
              <StudioTable.Cell>
                {person.methods.find((m) => m.methodType === 'email')?.value}
              </StudioTable.Cell>
              <StudioTable.Cell>
                {person.methods.find((m) => m.methodType === 'sms')?.value}
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
          ))}
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
        person={draft}
        onFieldChange={handleFieldChange}
        onSave={handleSave}
        onClose={closeDialog}
        isEditing={editingId !== null}
        isSaving={isSaving}
      />
    </>
  );
};
