import type { ReactElement, RefObject } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioDialog,
  StudioTextfield,
  StudioHeading,
  StudioParagraph,
  StudioFormActions,
} from '@studio/components';
import classes from './PersonDialog.module.css';

type PersonDraft = {
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
};

type PersonDialogProps = {
  dialogRef: RefObject<HTMLDialogElement | null>;
  person: PersonDraft;
  onFieldChange: (field: keyof PersonDraft, value: string | boolean) => void;
  onSave: () => void;
  onClose: () => void;
  isEditing: boolean;
  isSaving: boolean;
};

export const PersonDialog = ({
  dialogRef,
  person,
  onFieldChange,
  onSave,
  onClose,
  isEditing,
  isSaving,
}: PersonDialogProps): ReactElement => {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setSubmitted(false);
  }, [person]);

  const nameError = submitted && !person.name ? t('validation_errors.required') : undefined;

  const contactMethodError =
    submitted && !person.email && !person.phone
      ? t('org.settings.contact_points.error_contact_method_required')
      : undefined;

  const isValid = !!person.name && (!!person.email || !!person.phone);

  const handleSave = () => {
    setSubmitted(true);
    if (isValid) onSave();
  };

  const handleClose = () => {
    setSubmitted(false);
    onClose();
  };

  const title = isEditing
    ? t('org.settings.contact_points.dialog_edit_person_title')
    : t('org.settings.contact_points.dialog_add_person_title');

  return (
    <StudioDialog ref={dialogRef} onClose={handleClose}>
      <StudioDialog.Block className={classes.dialogBlock}>
        <StudioHeading level={2} data-size='sm'>
          {title}
        </StudioHeading>
        <StudioParagraph data-size='sm'>
          {t('org.settings.contact_points.dialog_subtitle')}
        </StudioParagraph>
        <div className={classes.fields}>
          <StudioTextfield
            label={t('org.settings.contact_points.field_name')}
            value={person.name}
            onChange={(e) => onFieldChange('name', e.target.value)}
            required
            error={nameError}
            tagText={t('general.required')}
          />
          <StudioTextfield
            label={t('org.settings.contact_points.field_email')}
            value={person.email}
            onChange={(e) => onFieldChange('email', e.target.value)}
            error={contactMethodError}
          />
          <StudioTextfield
            label={t('org.settings.contact_points.field_phone')}
            value={person.phone}
            onChange={(e) => onFieldChange('phone', e.target.value)}
            error={contactMethodError}
          />
        </div>
        <StudioFormActions
          primary={{ label: t('org.settings.contact_points.save'), onClick: handleSave }}
          secondary={{ label: t('org.settings.contact_points.cancel'), onClick: handleClose }}
          isLoading={isSaving}
        />
      </StudioDialog.Block>
    </StudioDialog>
  );
};
