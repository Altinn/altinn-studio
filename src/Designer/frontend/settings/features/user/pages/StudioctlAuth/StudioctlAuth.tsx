import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  StudioAlert,
  StudioButton,
  StudioCenter,
  StudioHeading,
  StudioPageSpinner,
  StudioParagraph,
} from '@studio/components';
import { StudioPageError } from 'app-shared/components';
import { useUserQuery } from 'app-shared/hooks/queries';
import { useEnvironmentConfig } from 'app-shared/contexts/EnvironmentConfigContext';
import { NotFound } from '../../../../components/NotFound/NotFound';
import { useRequiredRoutePathsParams } from '../../../../hooks/useRequiredRoutePathsParams';
import { useStudioctlAuthRequestQuery } from '../../hooks/queries/useStudioctlAuthRequestQuery';
import { useConfirmStudioctlAuthRequestMutation } from '../../hooks/mutations/useConfirmStudioctlAuthRequestMutation';
import { useCancelStudioctlAuthRequestMutation } from '../../hooks/mutations/useCancelStudioctlAuthRequestMutation';
import classes from './StudioctlAuth.module.css';

export const StudioctlAuth = (): React.ReactElement => {
  const { t } = useTranslation();
  const { owner } = useRequiredRoutePathsParams(['owner']);
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('requestId');
  const { environment, isPending: isEnvironmentPending } = useEnvironmentConfig();
  const { data: user, isPending: isUserPending, isError: isUserError } = useUserQuery();
  const canLoadRequest =
    Boolean(environment?.featureFlags?.studioOidc) && owner === user?.login && Boolean(requestId);
  const {
    data: request,
    isPending: isRequestPending,
    isError: isRequestError,
  } = useStudioctlAuthRequestQuery(requestId, canLoadRequest, { hideDefaultError: true });
  const { mutate: confirmRequest, isPending: isConfirming } =
    useConfirmStudioctlAuthRequestMutation();
  const { mutate: cancelRequest, isPending: isCancelling } =
    useCancelStudioctlAuthRequestMutation();

  if (isEnvironmentPending || isUserPending || (canLoadRequest && isRequestPending)) {
    return (
      <StudioCenter>
        <StudioPageSpinner spinnerTitle={t('general.loading')} />
      </StudioCenter>
    );
  }

  if (isUserError) {
    return <StudioPageError />;
  }

  if (!environment?.featureFlags?.studioOidc || owner !== user?.login || !requestId) {
    return <NotFound />;
  }

  if (isRequestError || !request) {
    return <StudioPageError />;
  }

  const redirectToCallback = (callbackUrl: string) => window.location.assign(callbackUrl);
  const confirm = () =>
    confirmRequest(requestId, { onSuccess: ({ callbackUrl }) => redirectToCallback(callbackUrl) });
  const cancel = () =>
    cancelRequest(requestId, { onSuccess: ({ callbackUrl }) => redirectToCallback(callbackUrl) });
  const isSubmitting = isConfirming || isCancelling;

  return (
    <main className={classes.page}>
      <div className={classes.container}>
        <div className={classes.heading}>
          <StudioHeading level={2} data-size='md'>
            {t('settings.studioctl_auth.heading')}
          </StudioHeading>
          <StudioParagraph data-size='md'>
            {t('settings.studioctl_auth.description', { clientName: request.clientName })}
          </StudioParagraph>
        </div>
        <dl className={classes.details}>
          <div className={classes.detailsRow}>
            <dt>{t('settings.studioctl_auth.user')}</dt>
            <dd>{request.username}</dd>
          </div>
          <div className={classes.detailsRow}>
            <dt>{t('settings.studioctl_auth.client')}</dt>
            <dd>{request.clientName}</dd>
          </div>
          <div className={classes.detailsRow}>
            <dt>{t('settings.studioctl_auth.api_key')}</dt>
            <dd>{request.tokenName}</dd>
          </div>
          <div className={classes.detailsRow}>
            <dt>{t('settings.studioctl_auth.expires_at')}</dt>
            <dd>{formatExpiresAt(request.expiresAt)}</dd>
          </div>
        </dl>
        <StudioAlert data-color='info'>
          <StudioHeading level={3} data-size='2xs'>
            {t('settings.studioctl_auth.permissions_heading')}
          </StudioHeading>
          <ul className={classes.permissions}>
            <li>{t('settings.studioctl_auth.permission_authenticate')}</li>
            <li>{t('settings.studioctl_auth.permission_api')}</li>
            <li>{t('settings.studioctl_auth.permission_repos')}</li>
            <li>{t('settings.studioctl_auth.permission_no_browser')}</li>
          </ul>
        </StudioAlert>
        <StudioAlert data-color='warning'>{t('settings.studioctl_auth.warning')}</StudioAlert>
        <div className={classes.actions}>
          <StudioButton onClick={confirm} disabled={isSubmitting}>
            {t('settings.studioctl_auth.confirm')}
          </StudioButton>
          <StudioButton variant='secondary' onClick={cancel} disabled={isSubmitting}>
            {t('settings.studioctl_auth.cancel')}
          </StudioButton>
        </div>
      </div>
    </main>
  );
};

const formatExpiresAt = (value: string): string =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
