import type { ReactElement, RefObject } from 'react';
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
  dialogRef: RefObject<HTMLDialogElement>;
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

  const title = isEditing
    ? t('org.settings.contact_points.dialog_edit_person_title')
    : t('org.settings.contact_points.dialog_add_person_title');

  return (
    <StudioDialog ref={dialogRef} onClose={onClose}>
      <StudioDialog.Block>
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
          />
          <StudioTextfield
            label={t('org.settings.contact_points.field_email')}
            value={person.email}
            onChange={(e) => onFieldChange('email', e.target.value)}
          />
          <StudioTextfield
            label={t('org.settings.contact_points.field_phone')}
            value={person.phone}
            onChange={(e) => onFieldChange('phone', e.target.value)}
          />
        </div>
        <StudioFormActions
          primary={{ label: t('org.settings.contact_points.save'), onClick: onSave }}
          secondary={{ label: t('org.settings.contact_points.cancel'), onClick: onClose }}
          isLoading={isSaving}
        />
      </StudioDialog.Block>
    </StudioDialog>
  );
};
