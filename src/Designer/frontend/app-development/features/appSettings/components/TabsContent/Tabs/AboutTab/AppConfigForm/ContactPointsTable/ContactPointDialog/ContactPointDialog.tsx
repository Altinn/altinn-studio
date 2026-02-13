import React from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import {
  StudioDialog,
  StudioFieldset,
  StudioFormActions,
  StudioTextfield,
} from '@studio/components';
import type { ContactPoint } from 'app-shared/types/AppConfig';
import { ContactPointField } from 'app-shared/types/AppConfig';
import { useTranslation } from 'react-i18next';
import classes from './ContactPointDialog.module.css';

export type ContactPointDialogProps = {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  draftContactPoint: ContactPoint;
  onFieldChange: (
    field: keyof ContactPoint | ContactPointField,
  ) => (event: ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
  onClose: () => void;
};

const contactPointFieldConfig: {
  field: ContactPointField;
  labelKey: string;
  descriptionKey?: string;
}[] = [
  {
    field: ContactPointField.Email,
    labelKey: 'app_settings.about_tab_contact_point_fieldset_email_label',
  },
  {
    field: ContactPointField.Telephone,
    labelKey: 'app_settings.about_tab_contact_point_fieldset_telephone_label',
  },
  {
    field: ContactPointField.ContactPage,
    labelKey: 'app_settings.about_tab_contact_point_fieldset_contact_page_label',
  },
  {
    field: ContactPointField.Category,
    labelKey: 'app_settings.about_tab_contact_point_fieldset_category_label',
    descriptionKey: 'app_settings.about_tab_contact_point_fieldset_category_description',
  },
];

const isContactPointEmpty = (contact: ContactPoint): boolean =>
  [contact.email, contact.telephone, contact.contactPage, contact.category].every(
    (value) => !value?.trim(),
  );

export const ContactPointDialog = ({
  dialogRef,
  draftContactPoint,
  onFieldChange,
  onSave,
  onClose,
}: ContactPointDialogProps): ReactElement => {
  const { t } = useTranslation();
  const isSaveDisabled = isContactPointEmpty(draftContactPoint);

  const primaryAction = {
    label: t('general.save'),
    onClick: onSave,
    disabled: isSaveDisabled,
  };

  const secondaryAction = {
    label: t('general.cancel'),
    onClick: onClose,
  };

  return (
    <StudioDialog ref={dialogRef} onClose={onClose}>
      <StudioDialog.Block>
        <StudioFieldset
          className={classes.fieldset}
          legend={t('app_settings.about_tab_contact_point_dialog_add_title')}
          description={t('app_settings.about_tab_contact_point_fieldset_description')}
        >
          {contactPointFieldConfig.map(({ field, labelKey, descriptionKey }) => (
            <StudioTextfield
              key={field}
              label={t(labelKey)}
              value={draftContactPoint[field]}
              onChange={onFieldChange(field)}
              {...(descriptionKey && { description: t(descriptionKey) })}
            />
          ))}
          <StudioFormActions
            className={classes.formActions}
            isLoading={false}
            primary={primaryAction}
            secondary={secondaryAction}
          />
        </StudioFieldset>
      </StudioDialog.Block>
    </StudioDialog>
  );
};
