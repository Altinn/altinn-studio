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
import { useAddUserPersonalAccessTokenMutation } from '../hooks/mutations/useAddUserPersonalAccessTokenMutation';
import { useUserPersonalAccessTokensQuery } from '../hooks/queries/useUserPersonalAccessTokensQuery';
import classes from './AddPersonalAccessToken.module.css';

type AddPersonalAccessTokenProps = {
  onTokenCreated: (id: number) => void;
};

export const AddPersonalAccessToken = ({
  onTokenCreated,
}: AddPersonalAccessTokenProps): React.ReactElement => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [newTokenKey, setNewTokenKey] = useState<string | null>(null);

  const {
    mutate: addUserPersonalAccessToken,
    isPending,
    error,
    reset,
  } = useAddUserPersonalAccessTokenMutation();
  const { data: existingTokens } = useUserPersonalAccessTokensQuery();

  const todayUtc = new Date().toISOString().split('T')[0];
  const maxExpiresAt = new Date(todayUtc);
  maxExpiresAt.setUTCDate(maxExpiresAt.getUTCDate() + 364);
  const maxExpiresAtString = maxExpiresAt.toISOString().split('T')[0];

  const isDuplicateName =
    (submitted && existingTokens?.some((token) => token.name === name)) ||
    error?.response?.status === ServerCodes.Conflict;
  const isExpiryInPast = expiresAt < todayUtc;
  const isExpiryTooLong = expiresAt > maxExpiresAtString;

  const handleAdd = () => {
    setSubmitted(true);
    reset();
    if (
      !name ||
      !expiresAt ||
      isExpiryInPast ||
      isExpiryTooLong ||
      existingTokens?.some((token) => token.name === name)
    )
      return;
    addUserPersonalAccessToken(
      { name, expiresAt: `${expiresAt}T23:59:59Z` },
      {
        onSuccess: (response) => {
          setNewTokenKey(response.key);
          onTokenCreated(response.id);
          setName('');
          setExpiresAt('');
          setSubmitted(false);
        },
      },
    );
  };

  if (newTokenKey) {
    return (
      <StudioAlert data-color='success' className={classes.tokenAlert}>
        <StudioButton
          variant='tertiary'
          icon={<StudioCloseIcon />}
          onClick={() => setNewTokenKey(null)}
          aria-label={t('general.close')}
          className={classes.tokenAlertCloseButton}
        />
        <StudioHeading level={3}>
          {t('user.settings.personal_access_tokens.new_token_dialog_title')}
        </StudioHeading>
        <StudioParagraph>
          {t('user.settings.personal_access_tokens.new_token_dialog_warning')}
        </StudioParagraph>
        <StudioTextfield
          readOnly
          value={newTokenKey}
          label={t('user.settings.personal_access_tokens.token_value')}
        />
        <StudioButton
          icon={<ClipboardIcon />}
          onClick={() => {
            navigator.clipboard.writeText(newTokenKey).then(
              () => {
                toast.success(t('user.settings.personal_access_tokens.copy_success'), {
                  toastId: 'user.settings.personal_access_tokens.copy_success',
                });
              },
              () => {
                toast.error(t('user.settings.personal_access_tokens.copy_error'), {
                  toastId: 'user.settings.personal_access_tokens.copy_error',
                });
              },
            );
          }}
        >
          {t('user.settings.personal_access_tokens.copy')}
        </StudioButton>
      </StudioAlert>
    );
  }

  return (
    <StudioCard className={classes.card}>
      <StudioCard.Block className={classes.addForm}>
        <StudioHeading level={3}>
          {t('user.settings.personal_access_tokens.add.header')}
        </StudioHeading>
        <StudioTextfield
          label={t('user.settings.personal_access_tokens.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          tagText={t('general.required')}
          error={
            (submitted && !name ? t('validation_errors.required') : undefined) ??
            (isDuplicateName
              ? t('user.settings.personal_access_tokens.error_duplicate_name')
              : undefined)
          }
          maxLength={100}
        />
        <StudioTextfield
          label={t('user.settings.personal_access_tokens.expires_at')}
          type='date'
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          min={todayUtc}
          max={maxExpiresAtString}
          required
          tagText={t('general.required')}
          error={
            (submitted && !expiresAt ? t('validation_errors.required') : undefined) ??
            (submitted && isExpiryInPast
              ? t('user.settings.personal_access_tokens.error_expiry_in_past')
              : undefined) ??
            (submitted && isExpiryTooLong
              ? t('user.settings.personal_access_tokens.error_expiry_too_long')
              : undefined)
          }
          className={classes.dateInput}
        />
        <StudioButton
          data-color='success'
          icon={<PlusIcon />}
          onClick={handleAdd}
          disabled={isPending}
        >
          {t('user.settings.personal_access_tokens.add')}
        </StudioButton>
      </StudioCard.Block>
    </StudioCard>
  );
};
