import type { ReactElement, RefObject } from 'react';
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
} from 'admin/constants/contactPointConstants';

export type Person = {
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  environments: string[];
};

type PersonDialogProps = {
  dialogRef: RefObject<HTMLDialogElement | null>;
  person: Person;
  availableEnvironments: string[];
  onFieldChange: (field: keyof Person, value: string | boolean | string[]) => void;
  onSave: () => void;
  onClose: () => void;
  isEditing: boolean;
  isSaving: boolean;
};

export const PersonDialog = ({
  dialogRef,
  person,
  availableEnvironments,
  onFieldChange,
  onSave,
  onClose,
  isEditing,
  isSaving,
}: PersonDialogProps): ReactElement => {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);

  const nameError = submitted && !person.name ? t('validation_errors.required') : undefined;

  const emailError =
    submitted && person.email && !emailRegex.test(person.email)
      ? t('validation_errors.invalid_email')
      : undefined;

  const phoneError =
    submitted && person.phone && !phoneRegex.test(person.phone)
      ? t('validation_errors.invalid_phone')
      : undefined;

  const contactMethodError =
    submitted && !person.email && !person.phone
      ? t('org.settings.contact_points.error_contact_method_required')
      : undefined;

  const isValid =
    !!person.name &&
    (!!person.email || !!person.phone) &&
    (!person.email || emailRegex.test(person.email)) &&
    (!person.phone || phoneRegex.test(person.phone));

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
    : t('org.settings.contact_points.add_contact');

  const { getCheckboxProps, setValue } = useStudioCheckboxGroup({
    value: person.environments,
    onChange: (value) => onFieldChange('environments', value),
    name: 'personEnvironments',
  });

  useEffect(() => {
    setValue(person.environments);
  }, [person.environments, setValue]);

  return (
    <StudioDialog ref={dialogRef} onClose={handleClose}>
      <StudioDialog.Block className={classes.dialogBlock}>
        <StudioHeading level={2}>{title}</StudioHeading>
        <StudioParagraph>{t('org.settings.contact_points.dialog_subtitle')}</StudioParagraph>
        <div className={classes.fields}>
          <StudioTextfield
            label={t('org.settings.contact_points.field_name')}
            value={person.name}
            onChange={(e) => onFieldChange('name', e.target.value)}
            maxLength={nameMaxLength}
            required
            error={nameError}
            tagText={t('general.required')}
          />
          <StudioTextfield
            label={t('org.settings.contact_points.field_email')}
            value={person.email}
            onChange={(e) => onFieldChange('email', e.target.value)}
            maxLength={emailMaxLength}
            placeholder={emailPlaceholder}
            error={emailError ?? contactMethodError}
          />
          <StudioTextfield
            label={t('org.settings.contact_points.field_phone')}
            value={person.phone}
            onChange={(e) => onFieldChange('phone', e.target.value)}
            maxLength={phoneMaxLength}
            placeholder={phonePlaceholder}
            error={phoneError ?? contactMethodError}
          />
          <StudioCheckboxGroup
            legend={t('org.settings.contact_points.field_environments')}
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
        <StudioFormActions
          primary={{ label: t('org.settings.contact_points.save'), onClick: handleSave }}
          secondary={{ label: t('org.settings.contact_points.cancel'), onClick: handleClose }}
          isLoading={isSaving}
          className={classes.actionsWrapper}
        />
      </StudioDialog.Block>
    </StudioDialog>
  );
};
