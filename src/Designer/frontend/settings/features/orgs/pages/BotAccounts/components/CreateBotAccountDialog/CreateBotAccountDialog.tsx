import type { ReactElement, RefObject } from 'react';
import { useState } from 'react';
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
import classes from './CreateBotAccountDialog.module.css';

const nameRegex = /^[a-z0-9_]+$/;
const nameMaxLength = 100;

export type CreateBotAccountForm = {
  name: string;
  deployEnvironments: string[];
};

type CreateBotAccountDialogProps = {
  dialogRef: RefObject<HTMLDialogElement | null>;
  form: CreateBotAccountForm;
  availableEnvironments: string[];
  onFieldChange: (field: keyof CreateBotAccountForm, value: string | string[]) => void;
  onSave: () => void;
  onClose: () => void;
  isSaving: boolean;
};

export const CreateBotAccountDialog = ({
  dialogRef,
  form,
  availableEnvironments,
  onFieldChange,
  onSave,
  onClose,
  isSaving,
}: CreateBotAccountDialogProps): ReactElement => {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);

  const nameError =
    submitted && !form.name
      ? t('validation_errors.required')
      : submitted && !nameRegex.test(form.name)
        ? t('settings.orgs.bot_accounts.error_name_invalid')
        : undefined;

  const isValid = !!form.name && nameRegex.test(form.name);

  const handleSave = () => {
    setSubmitted(true);
    if (isValid) onSave();
  };

  const handleClose = () => {
    setSubmitted(false);
    onClose();
  };

  const { getCheckboxProps } = useStudioCheckboxGroup({
    value: form.deployEnvironments,
    onChange: (value) => onFieldChange('deployEnvironments', value),
    name: 'botAccountEnvironments',
  });

  return (
    <StudioDialog ref={dialogRef} onClose={handleClose}>
      <StudioDialog.Block className={classes.dialogBlock}>
        <StudioHeading level={2}>
          {t('settings.orgs.bot_accounts.create_dialog_title')}
        </StudioHeading>
        <StudioParagraph>{t('settings.orgs.bot_accounts.create_dialog_subtitle')}</StudioParagraph>
        <div className={classes.fields}>
          <StudioTextfield
            label={t('settings.orgs.bot_accounts.field_name')}
            value={form.name}
            onChange={(e) => onFieldChange('name', e.target.value)}
            maxLength={nameMaxLength}
            required
            tagText={t('general.required')}
            error={nameError}
          />
          {availableEnvironments.length > 0 && (
            <StudioCheckboxGroup
              legend={t('settings.orgs.bot_accounts.field_deploy_environments')}
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
          )}
        </div>
        <StudioFormActions
          primary={{ label: t('settings.orgs.bot_accounts.create'), onClick: handleSave }}
          secondary={{ label: t('settings.orgs.bot_accounts.cancel'), onClick: handleClose }}
          isLoading={isSaving}
          className={classes.actionsWrapper}
        />
      </StudioDialog.Block>
    </StudioDialog>
  );
};
