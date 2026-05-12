import type { ReactElement } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
  StudioAlert,
  StudioButton,
  StudioDialog,
  StudioFormActions,
  StudioHeading,
  StudioParagraph,
  StudioTextfield,
} from '@studio/components';
import { ClipboardIcon, StudioCloseIcon } from '@studio/icons';
import classes from './ApiKeyDialog.module.css';

const MAX_API_KEY_EXPIRY_DAYS = 365;

export const formatLocalDate = (date: Date): string =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');

export const computeMaxExpiresAt = (): string => {
  const date = new Date();
  date.setDate(date.getDate() + MAX_API_KEY_EXPIRY_DAYS);
  return formatLocalDate(date);
};

type ApiKeyDialogProps = {
  newApiKey: string | null;
  onSave: (name: string, expiresAt: string) => void;
  onClose: () => void;
  isSaving: boolean;
  onNameChange?: () => void;
  isDuplicateName?: (name: string) => boolean;
};

export const ApiKeyDialog = ({
  newApiKey,
  onSave,
  onClose,
  isSaving,
  onNameChange,
  isDuplicateName,
}: ApiKeyDialogProps): ReactElement => {
  const { t } = useTranslation();
  const dialogTitle = t('settings.api_keys.add');
  const dialogSubtitle = t('settings.api_keys.dialog_subtitle');
  const saveButton = t('general.add');
  const [name, setName] = useState('');
  const [expiresAt, setExpiresAt] = useState(computeMaxExpiresAt);
  const [submitted, setSubmitted] = useState(false);
  const trimmedName = name.trim();

  const today = formatLocalDate(new Date());

  const duplicateError =
    submitted && isDuplicateName?.(trimmedName)
      ? t('settings.api_keys.error_duplicate_name')
      : undefined;
  const requiredNameError = submitted && !trimmedName ? t('validation_errors.required') : undefined;
  const nameError = requiredNameError ?? duplicateError;
  const expiresAtError = submitted && !expiresAt ? t('validation_errors.required') : undefined;

  const handleNameChange = (value: string) => {
    setName(value);
    onNameChange?.();
  };

  const handleSave = () => {
    setSubmitted(true);
    if (trimmedName && expiresAt && !isDuplicateName?.(trimmedName)) onSave(trimmedName, expiresAt);
  };

  const handleClose = () => {
    setName('');
    setExpiresAt(computeMaxExpiresAt());
    setSubmitted(false);
    onClose();
  };

  const handleCopy = () => {
    if (!newApiKey) return;
    navigator.clipboard.writeText(newApiKey).then(
      () => {
        toast.success(t('settings.api_keys.copy_success'), {
          toastId: 'settings.api_keys.copy_success',
        });
        onClose();
      },
      () => {
        toast.error(t('settings.api_keys.copy_error'), {
          toastId: 'settings.api_keys.copy_error',
        });
      },
    );
  };

  if (newApiKey) {
    return (
      <StudioDialog open closeButton={false}>
        <StudioDialog.Block className={classes.keyDialogBlock}>
          <StudioAlert data-color='success' className={classes.keyDialogAlert}>
            <StudioButton
              variant='tertiary'
              icon={<StudioCloseIcon />}
              onClick={onClose}
              aria-label={t('general.close')}
              className={classes.keyDialogCloseButton}
            />
            <StudioHeading level={2}>{t('settings.api_keys.new_key_title')}</StudioHeading>
            <StudioParagraph>{t('settings.api_keys.new_key_warning')}</StudioParagraph>
            <StudioTextfield readOnly value={newApiKey} label={t('settings.api_keys.key_label')} />
            <StudioButton icon={<ClipboardIcon />} onClick={handleCopy} data-color='success'>
              {t('settings.api_keys.copy')}
            </StudioButton>
          </StudioAlert>
        </StudioDialog.Block>
      </StudioDialog>
    );
  }

  return (
    <StudioDialog open onClose={handleClose}>
      <StudioDialog.Block className={classes.dialogBlock}>
        <StudioHeading level={2}>{dialogTitle}</StudioHeading>
        {dialogSubtitle && <StudioParagraph>{dialogSubtitle}</StudioParagraph>}
        <div className={classes.fields}>
          <StudioTextfield
            label={t('settings.api_keys.field_name')}
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            maxLength={100}
            required
            tagText={t('general.required')}
            error={nameError}
          />
          <StudioTextfield
            label={t('settings.api_keys.field_expires_at')}
            type='date'
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            min={today}
            max={computeMaxExpiresAt()}
            required
            tagText={t('general.required')}
            error={expiresAtError}
          />
        </div>
        <StudioFormActions
          primary={{ label: saveButton, onClick: handleSave }}
          secondary={{ label: t('general.cancel'), onClick: handleClose }}
          isLoading={isSaving}
          className={classes.actionsWrapper}
        />
      </StudioDialog.Block>
    </StudioDialog>
  );
};
