import React, { useRef, useState } from 'react';
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
import type { OrgAlertPerson, OrgAlertPersonPayload } from 'app-shared/types/OrgAlertContactPoint';
import { AlertSeverity } from 'app-shared/types/OrgAlertContactPoint';
import { PersonDialog } from './PersonDialog/PersonDialog';
import { useAddOrgAlertPersonMutation } from '../../../../hooks/useAddOrgAlertPersonMutation';
import { useUpdateOrgAlertPersonMutation } from '../../../../hooks/useUpdateOrgAlertPersonMutation';
import { useDeleteOrgAlertPersonMutation } from '../../../../hooks/useDeleteOrgAlertPersonMutation';
import { useGetOrgReposQuery } from '../../../../hooks/useGetOrgReposQuery';
import { StudioEditIcon } from '@studio/icons';

type PersonsSectionProps = {
  org: string;
  persons: OrgAlertPerson[];
};

const emptyPerson = (): OrgAlertPersonPayload => ({
  name: '',
  email: '',
  emailSeverity: AlertSeverity.All,
  phone: '',
  smsSeverity: AlertSeverity.Critical,
  isActive: true,
  services: null,
});

const severityLabel: Record<AlertSeverity, string> = {
  [AlertSeverity.Critical]: 'severity_critical',
  [AlertSeverity.WarningAndCritical]: 'severity_warning_critical',
  [AlertSeverity.All]: 'severity_all',
  [AlertSeverity.None]: 'severity_none',
};

export const PersonsSection = ({ org, persons }: PersonsSectionProps): ReactElement => {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<OrgAlertPersonPayload>(emptyPerson());
  const [editingId, setEditingId] = useState<string | null>(null);

  const { mutate: addPerson, isPending: isAdding } = useAddOrgAlertPersonMutation(org);
  const { mutate: updatePerson, isPending: isUpdating } = useUpdateOrgAlertPersonMutation(org);
  const { mutate: deletePerson } = useDeleteOrgAlertPersonMutation(org);
  const { data: repos = [] } = useGetOrgReposQuery(org);
  const repoNames = repos.map((r) => r.name);

  const isSaving = isAdding || isUpdating;

  const openAddDialog = () => {
    setDraft(emptyPerson());
    setEditingId(null);
    dialogRef.current?.showModal();
  };

  const openEditDialog = (person: OrgAlertPerson) => {
    setDraft({
      name: person.name,
      email: person.email,
      emailSeverity: person.emailSeverity,
      phone: person.phone,
      smsSeverity: person.smsSeverity,
      isActive: person.isActive,
      services: person.services,
    });
    setEditingId(person.id);
    dialogRef.current?.showModal();
  };

  const closeDialog = () => {
    dialogRef.current?.close();
  };

  const handleFieldChange = (
    field: keyof OrgAlertPersonPayload,
    value: string | boolean | AlertSeverity,
  ) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleServicesChange = (value: string[] | null) => {
    setDraft((prev) => ({ ...prev, services: value }));
  };

  const handleSave = () => {
    if (editingId) {
      updatePerson({ id: editingId, payload: draft }, { onSuccess: closeDialog });
    } else {
      addPerson(draft, { onSuccess: closeDialog });
    }
  };

  const handleToggleActive = (person: OrgAlertPerson) => {
    updatePerson({
      id: person.id,
      payload: {
        name: person.name,
        email: person.email,
        emailSeverity: person.emailSeverity,
        phone: person.phone,
        smsSeverity: person.smsSeverity,
        isActive: !person.isActive,
        services: person.services,
      },
    });
  };

  const servicesLabel = (services: string[] | null): string => {
    if (services === null) return t('org.settings.contact_points.all_services');
    if (services.length === 0) return t('org.settings.contact_points.no_services');
    return services.join(', ');
  };

  return (
    <section>
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
            <StudioTable.HeaderCell>
              {t('org.settings.contact_points.col_services')}
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
                {person.email}
                {person.emailSeverity !== undefined && (
                  <span>
                    {' '}
                    — {t(`org.settings.contact_points.${severityLabel[person.emailSeverity]}`)}
                  </span>
                )}
              </StudioTable.Cell>
              <StudioTable.Cell>
                {person.phone && (
                  <>
                    {person.phone}
                    {person.smsSeverity !== undefined && (
                      <span>
                        {' '}
                        — {t(`org.settings.contact_points.${severityLabel[person.smsSeverity]}`)}
                      </span>
                    )}
                  </>
                )}
              </StudioTable.Cell>
              <StudioTable.Cell>{servicesLabel(person.services)}</StudioTable.Cell>
              <StudioTable.Cell>
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
      <StudioButton variant='secondary' onClick={openAddDialog}>
        + {t('org.settings.contact_points.add_contact')}
      </StudioButton>
      <PersonDialog
        dialogRef={dialogRef}
        person={draft}
        repoNames={repoNames}
        onFieldChange={handleFieldChange}
        onServicesChange={handleServicesChange}
        onSave={handleSave}
        onClose={closeDialog}
        isEditing={editingId !== null}
        isSaving={isSaving}
      />
    </section>
  );
};
