import type { ReactElement, RefObject } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioDialog,
  StudioTextfield,
  StudioHeading,
  StudioParagraph,
  StudioFormActions,
  StudioAlert,
  StudioButton,
} from '@studio/components';
import { ClipboardIcon, StudioCloseIcon } from '@studio/icons';
import { toast } from 'react-toastify';
import classes from './CreateApiKeyDialog.module.css';

export const MAX_API_KEY_EXPIRY_DAYS = 365;

const todayUtc = new Date().toISOString().split('T')[0];
const maxExpiresAt = (() => {
  const date = new Date(todayUtc);
  date.setUTCDate(date.getUTCDate() + MAX_API_KEY_EXPIRY_DAYS);
  return date.toISOString().split('T')[0];
})();

export const computeMaxExpiresAt = (): string => maxExpiresAt;

export type CreateApiKeyForm = {
  name: string;
  expiresAt: string;
};

type CreateApiKeyDialogProps = {
  dialogRef: RefObject<HTMLDialogElement | null>;
  form: CreateApiKeyForm;
  newApiKey: string | null;
  onFieldChange: (field: keyof CreateApiKeyForm, value: string) => void;
  onSave: () => void;
  onClose: () => void;
  onDismissNewApiKey: () => void;
  isSaving: boolean;
};

export const CreateApiKeyDialog = ({
  dialogRef,
  form,
  newApiKey,
  onFieldChange,
  onSave,
  onClose,
  onDismissNewApiKey,
  isSaving,
}: CreateApiKeyDialogProps): ReactElement => {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);

  const nameError = submitted && !form.name ? t('validation_errors.required') : undefined;
  const expiresAtError = submitted && !form.expiresAt ? t('validation_errors.required') : undefined;

  const isValid = !!form.name && !!form.expiresAt;

  const handleSave = () => {
    setSubmitted(true);
    if (isValid) onSave();
  };

  const handleClose = () => {
    setSubmitted(false);
    onClose();
  };

  const handleCopyKey = () => {
    if (!newApiKey) return;
    navigator.clipboard.writeText(newApiKey).then(
      () => {
        toast.success(t('settings.orgs.bot_accounts.api_key_copy_success'), {
          toastId: 'settings.orgs.bot_accounts.api_key_copy_success',
        });
        handleClose();
      },
      () => {
        toast.error(t('settings.orgs.bot_accounts.api_key_copy_error'), {
          toastId: 'settings.orgs.bot_accounts.api_key_copy_error',
        });
      },
    );
  };

  if (newApiKey) {
    return (
      <StudioDialog ref={dialogRef} closeButton={false}>
        <StudioDialog.Block className={classes.keyDialogBlock}>
          <StudioAlert data-color='success' className={classes.keyDialogAlert}>
            <StudioButton
              variant='tertiary'
              icon={<StudioCloseIcon />}
              onClick={handleClose}
              aria-label={t('general.close')}
              className={classes.keyDialogCloseButton}
            />
            <StudioHeading level={2}>
              {t('settings.user.api_keys.new_api_key_dialog_title')}
            </StudioHeading>
            <StudioParagraph>
              {t('settings.user.api_keys.new_api_key_dialog_warning')}
            </StudioParagraph>
            <StudioTextfield
              readOnly
              value={newApiKey}
              label={t('settings.user.api_keys.api_key')}
            />
            <StudioButton icon={<ClipboardIcon />} onClick={handleCopyKey} data-color='success'>
              {t('settings.user.api_keys.copy')}
            </StudioButton>
          </StudioAlert>
        </StudioDialog.Block>
      </StudioDialog>
    );
  }

  return (
    <StudioDialog ref={dialogRef} onClose={handleClose}>
      <StudioDialog.Block className={classes.dialogBlock}>
        <StudioHeading level={2}>
          {t('settings.orgs.bot_accounts.create_api_key_dialog_title')}
        </StudioHeading>
        <StudioParagraph>
          {t('settings.orgs.bot_accounts.create_api_key_dialog_subtitle')}
        </StudioParagraph>
        <div className={classes.fields}>
          <StudioTextfield
            label={t('settings.orgs.bot_accounts.api_key_field_name')}
            value={form.name}
            onChange={(e) => onFieldChange('name', e.target.value)}
            maxLength={100}
            required
            tagText={t('general.required')}
            error={nameError}
          />
          <StudioTextfield
            label={t('settings.orgs.bot_accounts.api_key_field_expires_at')}
            type='date'
            value={form.expiresAt}
            onChange={(e) => onFieldChange('expiresAt', e.target.value)}
            min={todayUtc}
            max={maxExpiresAt}
            required
            tagText={t('general.required')}
            error={expiresAtError}
          />
        </div>
        <StudioFormActions
          primary={{
            label: t('settings.orgs.bot_accounts.create_api_key'),
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
