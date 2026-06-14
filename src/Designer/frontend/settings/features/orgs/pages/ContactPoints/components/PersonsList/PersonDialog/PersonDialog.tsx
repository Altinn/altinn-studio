import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioCheckboxGroup,
  useStudioCheckboxGroup,
  StudioDialog,
  StudioTextfield,
  StudioHeading,
  StudioParagraph,
  StudioFormActions,
} from '@studio/components';
import classes from './PersonDialog.module.css';
import {
  emailRegex,
  phoneRegex,
  emailPlaceholder,
  phonePlaceholder,
  nameMaxLength,
  emailMaxLength,
  phoneMaxLength,
} from '../../../../../constants/contactPointConstants';
import { useAddContactPointMutation } from '../../../../../hooks/useAddContactPointMutation';
import { useUpdateContactPointMutation } from '../../../../../hooks/useUpdateContactPointMutation';
import { personToPayload } from '../personUtils';
import type { ContactPoint } from 'app-shared/types/ContactPoint';

export type Person = {
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  environments: string[];
};

type PersonDialogProps = {
  initialValue: Person;
  availableEnvironments: string[];
  org: string;
  editingId: string | null;
  auditInfo: ContactPoint | null;
  onClose: () => void;
};

const formatDate = (isoString: string): string =>
  new Date(isoString).toLocaleString('nb-NO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const PersonDialog = ({
  initialValue,
  availableEnvironments,
  org,
  editingId,
  auditInfo,
  onClose,
}: PersonDialogProps): ReactElement => {
  const { t } = useTranslation();
  const [person, setPerson] = useState(initialValue);
  const [submitted, setSubmitted] = useState(false);

  const { mutate: addPerson, isPending: isAdding } = useAddContactPointMutation(org);
  const { mutate: updatePerson, isPending: isUpdating } = useUpdateContactPointMutation(org);
  const isSaving = isAdding || isUpdating;

  const trimmedName = person.name.trim();
  const trimmedEmail = person.email.trim();
  const trimmedPhone = person.phone.trim();

  const nameError = submitted && !trimmedName ? t('validation_errors.required') : undefined;

  const emailError =
    submitted && trimmedEmail && !emailRegex.test(trimmedEmail)
      ? t('validation_errors.invalid_email')
      : undefined;

  const phoneError =
    submitted && trimmedPhone && !phoneRegex.test(trimmedPhone)
      ? t('validation_errors.invalid_phone')
      : undefined;

  const contactMethodError =
    submitted && !trimmedEmail && !trimmedPhone
      ? t('settings.orgs.contact_points.error_contact_method_required')
      : undefined;

  const isValid =
    !!trimmedName &&
    (!!trimmedEmail || !!trimmedPhone) &&
    (!trimmedEmail || emailRegex.test(trimmedEmail)) &&
    (!trimmedPhone || phoneRegex.test(trimmedPhone));

  const handleClose = () => {
    if (!isSaving) onClose();
  };

  const handleSave = () => {
    const trimmedPerson = {
      ...person,
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
    };
    setSubmitted(true);
    if (!isValid) return;
    const payload = personToPayload(trimmedPerson);
    if (editingId) {
      updatePerson({ id: editingId, payload }, { onSuccess: onClose });
    } else {
      addPerson(payload, { onSuccess: onClose });
    }
  };

  const isEditing = editingId !== null;

  const title = isEditing
    ? t('settings.orgs.contact_points.dialog_edit_person_title')
    : t('settings.orgs.contact_points.add_contact');

  const { getCheckboxProps, setValue } = useStudioCheckboxGroup({
    value: person.environments,
    onChange: (value) => setPerson((prev) => ({ ...prev, environments: value })),
    name: 'personEnvironments',
  });

  useEffect(() => {
    setValue(person.environments);
  }, [person.environments, setValue]);

  return (
    <StudioDialog open onClose={handleClose}>
      <StudioDialog.Block className={classes.dialogBlock}>
        <StudioHeading level={2}>{title}</StudioHeading>
        <StudioParagraph>{t('settings.orgs.contact_points.dialog_subtitle')}</StudioParagraph>
        <div className={classes.fields}>
          <StudioTextfield
            label={t('settings.orgs.contact_points.field_name')}
            value={person.name}
            onChange={(e) => setPerson((prev) => ({ ...prev, name: e.target.value }))}
            maxLength={nameMaxLength}
            required
            error={nameError}
            tagText={t('general.required')}
          />
          <StudioTextfield
            label={t('settings.orgs.contact_points.field_email')}
            value={person.email}
            onChange={(e) => setPerson((prev) => ({ ...prev, email: e.target.value }))}
            maxLength={emailMaxLength}
            placeholder={emailPlaceholder}
            error={emailError ?? contactMethodError}
          />
          <StudioTextfield
            label={t('settings.orgs.contact_points.field_phone')}
            value={person.phone}
            onChange={(e) => setPerson((prev) => ({ ...prev, phone: e.target.value }))}
            maxLength={phoneMaxLength}
            placeholder={phonePlaceholder}
            error={phoneError ?? contactMethodError}
          />
          <StudioCheckboxGroup
            legend={t('settings.orgs.contact_points.field_environments')}
            className={classes.environments}
          >
            <div className={classes.environmentOptions}>
              {availableEnvironments.map((env) => (
                <StudioCheckboxGroup.Item
                  key={env}
                  label={env}
                  getCheckboxProps={getCheckboxProps(env)}
                />
              ))}
            </div>
          </StudioCheckboxGroup>
        </div>
        {auditInfo && (
          <StudioParagraph size='sm' className={classes.auditInfo}>
            {auditInfo.createdByUsername
              ? t('settings.orgs.contact_points.audit_created_by_date', {
                  username: auditInfo.createdByUsername,
                  date: formatDate(auditInfo.createdAt),
                })
              : t('settings.orgs.contact_points.audit_created_date', {
                  date: formatDate(auditInfo.createdAt),
                })}
            {auditInfo.updatedByUsername &&
              ` · ${t('settings.orgs.contact_points.audit_updated_by_date', {
                username: auditInfo.updatedByUsername,
                date: formatDate(auditInfo.updatedAt),
              })}`}
          </StudioParagraph>
        )}
        <StudioFormActions
          primary={{
            label: isEditing ? t('general.save') : t('general.add'),
            onClick: handleSave,
          }}
          secondary={{ label: t('general.cancel'), onClick: handleClose }}
          isLoading={isSaving}
          className={classes.actionsWrapper}
        />
      </StudioDialog.Block>
    </StudioDialog>
  );
};
