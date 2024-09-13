import React, { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { Textfield, Paragraph, Alert, Modal } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioLabelAsParagraph } from '@studio/components';
import classes from './MigrationPanel.module.css';
import type { Environment } from '../../utils/resourceUtils';
import { useGetAltinn2DelegationsCount } from '../../hooks/queries/useGetAltinn2DelegationCount';
import { useMigrateDelegationsMutation } from '../../hooks/mutations/useMigrateDelegationsMutation';
import { useUrlParams } from '../../hooks/useUrlParams';
import type { ResourceError } from 'app-shared/types/ResourceAdm';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { useSetServiceEditionExpiredMutation } from '../../hooks/mutations';

export interface MigrationPanelProps {
  serviceCode: string;
  serviceEdition: string;
  env: Environment;
  isMigrationReady: boolean;
  isPublishedInEnv: boolean;
}

export const MigrationPanel = ({
  serviceCode,
  serviceEdition,
  env,
  isMigrationReady,
  isPublishedInEnv,
}: MigrationPanelProps): React.ReactNode => {
  const { t } = useTranslation();

  const { org, resourceId } = useUrlParams();

  const setServiceExpiredWarningModalRef = useRef<HTMLDialogElement>(null);
  const initialDate = new Date().toISOString().split('T')[0];
  const [migrationDate, setMigrationDate] = useState(initialDate);
  const [migrationTime, setMigrationTime] = useState('00:00');
  const [migrateDelegationsError, setMigrateDelegationsError] = useState<Error | null>(null);
  const [disableMigrationsError, setDisableMigrationsError] = useState<Error | null>(null);
  const [isDelegationCountEnabled, setIsDelegationCountEnabled] = useState<boolean>(false);

  const { mutate: migrateDelegations, isPending: isSettingMigrateDelegations } =
    useMigrateDelegationsMutation(org, env.id);

  const { mutate: setServiceEditionExpired, isPending: isSettingServiceExpired } =
    useSetServiceEditionExpiredMutation(org, serviceCode, serviceEdition, env.id);

  const {
    data: numberOfA2Delegations,
    refetch: refetchNumberOfA2Delegations,
    error: getNumberOfDelegationsError,
    isFetching: isLoadingDelegationCount,
  } = useGetAltinn2DelegationsCount(
    org,
    serviceCode,
    serviceEdition,
    env.id,
    !isDelegationCountEnabled,
  );

  const isErrorForbidden = (error: Error) => {
    return (error as ResourceError)?.response?.status === ServerCodes.Forbidden;
  };

  const setServiceExpired = () => {
    closeSetServiceExpiredModal();
    setServiceEditionExpired(undefined, {
      onSuccess: () => {
        toast.success(t('resourceadm.migration_disable_service_success', { env: t(env.label) }));
      },
      onError: (error: Error) => {
        setDisableMigrationsError(error);
      },
    });
  };

  const postMigrateDelegations = (): void => {
    setMigrateDelegationsError(null);
    const date = new Date(migrationDate);
    const [hours, minutes] = migrationTime.split(':');
    date.setHours(parseInt(hours), parseInt(minutes));

    migrateDelegations(
      {
        serviceCode: serviceCode,
        serviceEditionCode: parseInt(serviceEdition),
        resourceId: resourceId,
        dateTimeForExport: date,
      },
      {
        onSuccess: () => {
          toast.success(t('resourceadm.migration_migration_success', { env: t(env.label) }));
        },
        onError: (error: Error) => {
          setMigrateDelegationsError(error);
        },
      },
    );
  };

  const closeSetServiceExpiredModal = (): void => {
    setServiceExpiredWarningModalRef.current?.close();
  };

  return (
    <div className={classes.migrationPanel}>
      <Modal ref={setServiceExpiredWarningModalRef} onClose={closeSetServiceExpiredModal}>
        <Modal.Header>{t('resourceadm.migration_disable_service_modal_header')}</Modal.Header>
        <Modal.Content>{t('resourceadm.migration_disable_service_modal_body')}</Modal.Content>
        <Modal.Footer>
          <StudioButton color='danger' onClick={() => setServiceExpired()} size='medium'>
            {t('resourceadm.migration_disable_service_confirm')}
          </StudioButton>
          <StudioButton variant='tertiary' onClick={closeSetServiceExpiredModal} size='medium'>
            {t('general.cancel')}
          </StudioButton>
        </Modal.Footer>
      </Modal>
      <div>
        <StudioLabelAsParagraph size='medium' spacing>
          {t('resourceadm.migration_number_of_delegations')}
        </StudioLabelAsParagraph>
        <Paragraph size='small'>{t('resourceadm.migration_number_of_delegations_body')}</Paragraph>
        <div className={classes.delegations}>
          <div>
            <Paragraph size='small'>
              {t('resourceadm.migration_altinn_2')}:{' '}
              <strong>{numberOfA2Delegations?.numberOfDelegations ?? 'N/A'}</strong>{' '}
              {t('resourceadm.migration_delegations')}
            </Paragraph>
            <Paragraph size='small'>
              {t('resourceadm.migration_altinn_3')}: <strong>N/A</strong>{' '}
              {t('resourceadm.migration_delegations')}
            </Paragraph>
          </div>
          <StudioButton
            disabled={isLoadingDelegationCount}
            onClick={() =>
              isDelegationCountEnabled
                ? refetchNumberOfA2Delegations()
                : setIsDelegationCountEnabled(true)
            }
            variant='secondary'
            size='small'
          >
            {t('resourceadm.migration_get_number_of_delegations')}
          </StudioButton>
        </div>
        {getNumberOfDelegationsError && (
          <Alert severity='danger' size='small'>
            {isErrorForbidden(getNumberOfDelegationsError)
              ? t('resourceadm.migration_no_migration_access')
              : t('resourceadm.migration_get_number_of_delegations_failed')}
          </Alert>
        )}
      </div>
      <div>
        <StudioLabelAsParagraph size='medium'>
          {t('resourceadm.migration_disable_service_header')}
        </StudioLabelAsParagraph>
        <Paragraph size='small'>{t('resourceadm.migration_disable_service_body')}</Paragraph>
        <StudioButton
          aria-disabled={isSettingServiceExpired}
          onClick={() => {
            if (!isSettingServiceExpired) {
              setServiceExpiredWarningModalRef.current.showModal();
            }
          }}
          size='small'
        >
          {t('resourceadm.migration_disable_service_button', { env: t(env.label) })}
        </StudioButton>
        {disableMigrationsError && (
          <Alert severity='danger' size='small'>
            {t('resourceadm.migration_disable_service_error')}
          </Alert>
        )}
      </div>
      <div>
        <StudioLabelAsParagraph size='medium'>
          {t('resourceadm.migration_select_migration_time_header')}
        </StudioLabelAsParagraph>
        <Paragraph size='small'>{t('resourceadm.migration_select_migration_time_body')}</Paragraph>
        <div className={classes.datePickers}>
          <Textfield
            type='date'
            value={migrationDate}
            onChange={(e) => setMigrationDate(e.target.value)}
            label={t('resourceadm.migration_migration_date')}
            size='small'
          />
          <Textfield
            type='time'
            value={migrationTime}
            onChange={(e) => setMigrationTime(e.target.value)}
            label={t('resourceadm.migration_migration_time')}
            size='small'
          />
        </div>
        {!isPublishedInEnv && (
          <Alert severity='warning' size='small'>
            {t('resourceadm.migration_not_published_warning')}
          </Alert>
        )}
        <StudioButton
          aria-disabled={!isMigrationReady || !isPublishedInEnv || isSettingMigrateDelegations}
          onClick={() => {
            if (isMigrationReady && isPublishedInEnv && !isSettingMigrateDelegations) {
              postMigrateDelegations();
            }
          }}
          size='small'
        >
          {t('resourceadm.migration_migrate_delegations', { env: t(env.label) })}
        </StudioButton>
        {migrateDelegationsError && (
          <Alert severity='danger' size='small'>
            {isErrorForbidden(migrateDelegationsError)
              ? t('resourceadm.migration_no_migration_access')
              : t('resourceadm.migration_post_migration_failed')}
          </Alert>
        )}
      </div>
    </div>
  );
};
