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
import { ClipboardIcon } from '@navikt/aksel-icons';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { ApiErrorCodes } from 'app-shared/enums/ApiErrorCodes';
import { useAddUserApiKeyMutation } from '../../../hooks/mutations/useAddUserApiKeyMutation';
import { useUserApiKeysQuery } from '../../../hooks/queries/useUserApiKeysQuery';
import classes from './AddApiKeyDialog.module.css';
import { StudioCloseIcon } from '@studio/icons';

const MAX_USER_API_KEY_EXPIRY_DAYS = 365;

export const formatLocalDate = (date: Date): string =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');

export const computeMaxExpiresAt = (): string => {
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + MAX_USER_API_KEY_EXPIRY_DAYS);
  return formatLocalDate(maxDate);
};

type AddApiKeyDialogProps = {
  onApiKeyCreated: (id: number) => void;
  onClose: () => void;
};

export const AddApiKeyDialog = ({
  onApiKeyCreated,
  onClose,
}: AddApiKeyDialogProps): ReactElement => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [expiresAt, setExpiresAt] = useState(computeMaxExpiresAt);
  const [submitted, setSubmitted] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

  const {
    mutate: addUserApiKey,
    isPending,
    error,
    reset: resetMutation,
  } = useAddUserApiKeyMutation();
  const { data: apiKeys } = useUserApiKeysQuery();

  const today = formatLocalDate(new Date());

  const trimmedName = name.trim();
  const isDuplicateName =
    apiKeys?.some((apiKey) => apiKey.name === trimmedName) ||
    (error?.response?.status === ServerCodes.Conflict &&
      error?.response?.data?.errorCode === ApiErrorCodes.DuplicateTokenName);

  const handleClose = () => {
    if (!isPending) onClose();
  };

  const handleAdd = () => {
    setSubmitted(true);
    if (!trimmedName || !expiresAt || isDuplicateName) return;
    addUserApiKey(
      { name: trimmedName, expiresAt: `${expiresAt}T23:59:59Z` },
      {
        onSuccess: (response) => {
          setNewApiKey(response.key);
          onApiKeyCreated(response.id);
          setName('');
          setExpiresAt(computeMaxExpiresAt());
          setSubmitted(false);
        },
      },
    );
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(newApiKey!).then(
      () => {
        toast.success(t('settings.user.api_keys.copy_success'), {
          toastId: 'settings.user.api_keys.copy_success',
        });
        onClose();
      },
      () => {
        toast.error(t('settings.user.api_keys.copy_error'), {
          toastId: 'settings.user.api_keys.copy_error',
        });
      },
    );
  };

  if (newApiKey) {
    return (
      <StudioDialog closeButton={false} open>
        <StudioDialog.Block className={classes.keyDialogBlock}>
          <StudioAlert data-color='success' className={classes.keyDialogAlert}>
            <StudioButton
              variant='tertiary'
              icon={<StudioCloseIcon />}
              onClick={onClose}
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
            <StudioButton icon={<ClipboardIcon />} onClick={handleCopy} data-color='success'>
              {t('settings.user.api_keys.copy')}
            </StudioButton>
          </StudioAlert>
        </StudioDialog.Block>
      </StudioDialog>
    );
  }

  return (
    <StudioDialog open onClose={handleClose}>
      <StudioDialog.Block className={classes.addDialogBlock}>
        <StudioHeading level={2}>{t('settings.user.api_keys.add')}</StudioHeading>
        <div className={classes.fields}>
          <StudioTextfield
            label={t('settings.user.api_keys.name')}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              resetMutation();
            }}
            required
            tagText={t('general.required')}
            error={
              submitted &&
              ((!trimmedName ? t('validation_errors.required') : undefined) ??
                (isDuplicateName ? t('settings.user.api_keys.error_duplicate_name') : undefined))
            }
            maxLength={100}
          />
          <StudioTextfield
            label={t('settings.user.api_keys.expires_at')}
            type='date'
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            min={today}
            max={computeMaxExpiresAt()}
            required
            tagText={t('general.required')}
            error={submitted && !expiresAt ? t('validation_errors.required') : undefined}
            className={classes.dateInput}
          />
        </div>
        <StudioFormActions
          primary={{ label: t('general.add'), onClick: handleAdd }}
          secondary={{ label: t('general.cancel'), onClick: handleClose }}
          isLoading={isPending}
        />
      </StudioDialog.Block>
    </StudioDialog>
  );
};
