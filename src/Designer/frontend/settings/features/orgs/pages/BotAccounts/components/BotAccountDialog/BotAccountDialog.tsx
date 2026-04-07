import type { ReactElement, RefObject } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioCheckbox,
  StudioCheckboxGroup,
  StudioDialog,
  StudioTextfield,
  StudioHeading,
  StudioParagraph,
  StudioFormActions,
} from '@studio/components';
import classes from './BotAccountDialog.module.css';

const nameRegex = /^[a-z0-9_]+$/;
const nameMaxLength = 100;

export type BotAccountForm = {
  name: string;
  deployEnvironments: string[];
};

type BotAccountDialogProps = {
  dialogRef: RefObject<HTMLDialogElement | null>;
  form: BotAccountForm;
  availableEnvironments: string[];
  onFieldChange: (field: keyof BotAccountForm, value: string | string[]) => void;
  onSave: () => void;
  onClose: () => void;
  isEditing: boolean;
  isSaving: boolean;
};

export const BotAccountDialog = ({
  dialogRef,
  form,
  availableEnvironments,
  onFieldChange,
  onSave,
  onClose,
  isEditing,
  isSaving,
}: BotAccountDialogProps): ReactElement => {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);
  const [selectedEnvironments, setSelectedEnvironments] = useState<string[]>(
    form.deployEnvironments.map((e) => e.toLowerCase()),
  );

  const nameError =
    submitted && !form.name
      ? t('validation_errors.required')
      : submitted && !nameRegex.test(form.name)
        ? t('settings.orgs.bot_accounts.error_name_invalid')
        : undefined;

  const isValid = isEditing || (!!form.name && nameRegex.test(form.name));

  const handleSave = () => {
    setSubmitted(true);
    if (isValid) onSave();
  };

  const handleClose = () => {
    setSubmitted(false);
    onClose();
  };

  const handleEnvironmentChange = (env: string, checked: boolean) => {
    const next = checked
      ? [...selectedEnvironments, env]
      : selectedEnvironments.filter((e) => e !== env);
    setSelectedEnvironments(next);
    onFieldChange('deployEnvironments', next);
  };

  const title = isEditing
    ? t('settings.orgs.bot_accounts.edit_dialog_title')
    : t('settings.orgs.bot_accounts.create_dialog_title');

  return (
    <StudioDialog ref={dialogRef} onClose={handleClose}>
      <StudioDialog.Block className={classes.dialogBlock}>
        <StudioHeading level={2}>{title}</StudioHeading>
        <StudioParagraph>{t('settings.orgs.bot_accounts.create_dialog_subtitle')}</StudioParagraph>
        <div className={classes.fields}>
          <StudioTextfield
            label={t('settings.orgs.bot_accounts.field_name')}
            value={form.name}
            onChange={(e) => onFieldChange('name', e.target.value)}
            maxLength={nameMaxLength}
            required={!isEditing}
            tagText={isEditing ? undefined : t('general.required')}
            readOnly={isEditing}
            error={nameError}
          />
          {availableEnvironments.length > 0 && (
            <StudioCheckboxGroup
              legend={t('settings.orgs.bot_accounts.field_deploy_environments')}
              className={classes.environments}
            >
              <div className={classes.environmentOptions}>
                {availableEnvironments.map((env) => (
                  <StudioCheckbox
                    key={env}
                    label={env}
                    checked={selectedEnvironments.includes(env)}
                    onChange={(e) => handleEnvironmentChange(env, e.target.checked)}
                  />
                ))}
              </div>
            </StudioCheckboxGroup>
          )}
        </div>
        <StudioFormActions
          primary={{
            label: isEditing
              ? t('settings.orgs.bot_accounts.save')
              : t('settings.orgs.bot_accounts.create'),
            onClick: handleSave,
          }}
          secondary={{ label: t('settings.orgs.bot_accounts.cancel'), onClick: handleClose }}
          isLoading={isSaving}
          className={classes.actionsWrapper}
        />
      </StudioDialog.Block>
    </StudioDialog>
  );
};
