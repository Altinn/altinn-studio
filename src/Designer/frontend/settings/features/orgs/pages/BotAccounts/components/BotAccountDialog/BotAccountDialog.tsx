import type { ReactElement } from 'react';
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
import { useCreateBotAccountMutation } from '../../hooks/useCreateBotAccountMutation';
import { useUpdateBotAccountMutation } from '../../hooks/useUpdateBotAccountMutation';
import classes from './BotAccountDialog.module.css';

const nameRegex = /^[a-z0-9_]+$/;
const nameMaxLength = 100;

export type BotAccountForm = {
  name: string;
  deployEnvironments: string[];
};

type BotAccountDialogProps = {
  org: string;
  initialForm: BotAccountForm;
  availableEnvironments: string[];
  onClose: () => void;
  editingId: string | null;
  onCreated?: (id: string) => void;
};

export const BotAccountDialog = ({
  org,
  initialForm,
  availableEnvironments,
  onClose,
  editingId,
  onCreated,
}: BotAccountDialogProps): ReactElement => {
  const { t } = useTranslation();
  const isEditing = editingId !== null;
  const [form, setForm] = useState<BotAccountForm>({
    ...initialForm,
    deployEnvironments: initialForm.deployEnvironments.map((e) => e.toLowerCase()),
  });
  const [submitted, setSubmitted] = useState(false);

  const { mutate: createBotAccount, isPending: isCreating } = useCreateBotAccountMutation(org);
  const { mutate: updateTeams, isPending: isUpdatingTeams } = useUpdateBotAccountMutation(
    org,
    editingId ?? '',
  );
  const isSaving = isCreating || isUpdatingTeams;

  const nameError =
    submitted && !form.name
      ? t('validation_errors.required')
      : submitted && !nameRegex.test(form.name)
        ? t('settings.orgs.bot_accounts.error_name_invalid')
        : undefined;

  const isValid = isEditing || (!!form.name && nameRegex.test(form.name));

  const handleSave = () => {
    setSubmitted(true);
    if (!isValid) return;
    if (isEditing) {
      updateTeams(form.deployEnvironments, { onSuccess: onClose });
    } else {
      createBotAccount(
        {
          name: form.name,
          deployEnvironments: form.deployEnvironments.length > 0 ? form.deployEnvironments : null,
        },
        {
          onSuccess: (response) => {
            onCreated?.(response.id);
            onClose();
          },
        },
      );
    }
  };

  const handleEnvironmentChange = (env: string, checked: boolean) => {
    const next = checked
      ? [...form.deployEnvironments, env]
      : form.deployEnvironments.filter((e) => e !== env);
    setForm((prev) => ({ ...prev, deployEnvironments: next }));
  };

  const title = isEditing
    ? t('settings.orgs.bot_accounts.edit_dialog_title')
    : t('settings.orgs.bot_accounts.create_dialog_title');

  return (
    <StudioDialog open onClose={onClose}>
      <StudioDialog.Block className={classes.dialogBlock}>
        <StudioHeading level={2}>{title}</StudioHeading>
        <StudioParagraph>{t('settings.orgs.bot_accounts.create_dialog_subtitle')}</StudioParagraph>
        <div className={classes.fields}>
          <StudioTextfield
            label={t('settings.orgs.bot_accounts.field_name')}
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
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
                    checked={form.deployEnvironments.includes(env)}
                    onChange={(e) => handleEnvironmentChange(env, e.target.checked)}
                  />
                ))}
              </div>
            </StudioCheckboxGroup>
          )}
        </div>
        <StudioFormActions
          primary={{
            label: isEditing ? t('general.save') : t('general.add'),
            onClick: handleSave,
          }}
          secondary={{ label: t('general.cancel'), onClick: onClose }}
          isLoading={isSaving}
          className={classes.actionsWrapper}
        />
      </StudioDialog.Block>
    </StudioDialog>
  );
};
