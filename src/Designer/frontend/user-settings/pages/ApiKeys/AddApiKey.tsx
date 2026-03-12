import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
  StudioAlert,
  StudioButton,
  StudioCard,
  StudioHeading,
  StudioParagraph,
  StudioTextfield,
} from '@studio/components';
import { StudioCloseIcon } from '@studio/icons';
import { ClipboardIcon, PlusIcon } from '@navikt/aksel-icons';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { useAddUserApiKeyMutation } from '../hooks/mutations/useAddUserApiKeyMutation';
import { useUserApiKeysQuery } from '../hooks/queries/useUserApiKeysQuery';
import classes from './AddApiKey.module.css';
import { ApiErrorCodes } from 'app-shared/enums/ApiErrorCodes';

const MAX_USER_API_KEY_EXPIRY_DAYS = 365;

const computeMaxExpiresAt = (): string => {
  const todayUtc = new Date().toISOString().split('T')[0];
  const maxDate = new Date(todayUtc);
  maxDate.setUTCDate(maxDate.getUTCDate() + MAX_USER_API_KEY_EXPIRY_DAYS);
  return maxDate.toISOString().split('T')[0];
};

type AddApiKeyProps = {
  onApiKeyCreated: (id: number) => void;
};

export const AddApiKey = ({ onApiKeyCreated }: AddApiKeyProps): React.ReactElement => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [expiresAt, setExpiresAt] = useState(computeMaxExpiresAt);
  const [submitted, setSubmitted] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

  const { mutate: addUserApiKey, isPending, error } = useAddUserApiKeyMutation();
  const { data: apiKeys } = useUserApiKeysQuery();

  const todayUtc = new Date().toISOString().split('T')[0];
  const maxExpiresAtString = computeMaxExpiresAt();

  const isDuplicateName =
    apiKeys?.some((apiKey) => apiKey.name === name) ||
    (error?.response?.status === ServerCodes.Conflict &&
      error?.response?.data?.errorCode === ApiErrorCodes.DuplicateTokenName);

  const handleAdd = () => {
    setSubmitted(true);
    if (!name || !expiresAt || isDuplicateName) return;
    addUserApiKey(
      { name, expiresAt: `${expiresAt}T23:59:59Z` },
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

  if (newApiKey) {
    return (
      <StudioAlert data-color='success' className={classes.newApiKeyAlert}>
        <StudioButton
          variant='tertiary'
          icon={<StudioCloseIcon />}
          onClick={() => setNewApiKey(null)}
          aria-label={t('general.close')}
          className={classes.newApiKeyAlertCloseButton}
        />
        <StudioHeading level={3}>
          {t('user.settings.api_keys.new_api_key_dialog_title')}
        </StudioHeading>
        <StudioParagraph>{t('user.settings.api_keys.new_api_key_dialog_warning')}</StudioParagraph>
        <StudioTextfield readOnly value={newApiKey} label={t('user.settings.api_keys.api_key')} />
        <StudioButton
          icon={<ClipboardIcon />}
          onClick={() => {
            navigator.clipboard.writeText(newApiKey).then(
              () => {
                toast.success(t('user.settings.api_keys.copy_success'), {
                  toastId: 'user.settings.api_keys.copy_success',
                });
              },
              () => {
                toast.error(t('user.settings.api_keys.copy_error'), {
                  toastId: 'user.settings.api_keys.copy_error',
                });
              },
            );
          }}
        >
          {t('user.settings.api_keys.copy')}
        </StudioButton>
      </StudioAlert>
    );
  }

  return (
    <StudioCard className={classes.card}>
      <StudioCard.Block className={classes.addForm}>
        <StudioHeading level={3}>{t('user.settings.api_keys.add.header')}</StudioHeading>
        <StudioTextfield
          label={t('user.settings.api_keys.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          tagText={t('general.required')}
          error={
            submitted &&
            ((!name ? t('validation_errors.required') : undefined) ??
              (isDuplicateName ? t('user.settings.api_keys.error_duplicate_name') : undefined))
          }
          maxLength={100}
        />
        <StudioTextfield
          label={t('user.settings.api_keys.expires_at')}
          type='date'
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          min={todayUtc}
          max={maxExpiresAtString}
          required
          tagText={t('general.required')}
          error={submitted && !expiresAt ? t('validation_errors.required') : undefined}
          className={classes.dateInput}
        />
        <StudioButton
          type='submit'
          data-color='success'
          icon={<PlusIcon />}
          onClick={handleAdd}
          disabled={isPending}
        >
          {t('user.settings.api_keys.add')}
        </StudioButton>
      </StudioCard.Block>
    </StudioCard>
  );
};
