import React, { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { Alert, Modal, Checkbox, Heading } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';
import { StudioButton } from '@studio/components';
import classes from './MigrationPanel.module.css';
import type { Environment } from '../../utils/resourceUtils';
import { useGetAltinn2DelegationsCount } from '../../hooks/queries/useGetAltinn2DelegationCount';
import { useMigrateDelegationsMutation } from '../../hooks/mutations/useMigrateDelegationsMutation';
import { useUrlParams } from '../../hooks/useUrlParams';
import type { ResourceError } from 'app-shared/types/ResourceAdm';
import { ServerCodes } from 'app-shared/enums/ServerCodes';

export interface MigrationPanelProps {
  serviceCode: string;
  serviceEdition: string;
  env: Environment;
  isPublishedInEnv: boolean;
}

export const MigrationPanel = ({
  serviceCode,
  serviceEdition,
  env,
  isPublishedInEnv,
}: MigrationPanelProps): React.ReactNode => {
  const { t } = useTranslation();

  const { org, resourceId } = useUrlParams();

  const setServiceExpiredWarningModalRef = useRef<HTMLDialogElement>(null);
  const [migrateDelegationsError, setMigrateDelegationsError] = useState<Error | null>(null);
  const [isMigrateCheckboxChecked, setIsMigrateCheckboxChecked] = useState<boolean>(false);

  const { mutate: migrateDelegations, isPending: isSettingMigrateDelegations } =
    useMigrateDelegationsMutation(org, env.id);

  const { data: numberOfA2Delegations, isFetching: isLoadingDelegationCount } =
    useGetAltinn2DelegationsCount(org, serviceCode, serviceEdition, env.id, false);

  const isErrorForbidden = (error: Error) => {
    return (error as ResourceError)?.response?.status === ServerCodes.Forbidden;
  };

  const postMigrateDelegations = (): void => {
    setMigrateDelegationsError(null);
    closeSetServiceExpiredModal();

    migrateDelegations(
      {
        serviceCode: serviceCode,
        serviceEditionCode: parseInt(serviceEdition),
        resourceId: resourceId,
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
    <>
      <Modal ref={setServiceExpiredWarningModalRef} onClose={closeSetServiceExpiredModal}>
        <Modal.Header>{t('resourceadm.migration_disable_service_modal_header')}</Modal.Header>
        <Modal.Content>
          <Alert severity='warning'>{t('resourceadm.migration_disable_service_modal_body')}</Alert>
          <Checkbox
            value={isMigrateCheckboxChecked ? '1' : ''}
            onChange={() => setIsMigrateCheckboxChecked((old) => !old)}
          >
            Jeg er heeeelt sikker på at jeg vil migrere tjenesten
          </Checkbox>
        </Modal.Content>
        <Modal.Footer>
          <StudioButton
            disabled={!isMigrateCheckboxChecked}
            onClick={() => postMigrateDelegations()}
            size='medium'
          >
            {t('resourceadm.migration_disable_service_confirm')}
          </StudioButton>
          <StudioButton variant='tertiary' onClick={closeSetServiceExpiredModal} size='medium'>
            {t('general.cancel')}
          </StudioButton>
        </Modal.Footer>
      </Modal>
      <div className={classes.migrationPanel}>
        <div className={classes.migrationPanelInner}>
          <Heading size='sm'>{t(env.label)}</Heading>
          <div>
            {t('resourceadm.migration_altinn2_delegations')}{' '}
            {!isLoadingDelegationCount && (
              <strong>{numberOfA2Delegations?.numberOfDelegations ?? 'N/A'}</strong>
            )}
          </div>
          <div>
            {t('resourceadm.migration_altinn3_delegations')} <strong>N/A</strong>
          </div>
          {!isPublishedInEnv && (
            <Alert severity='warning' size='sm'>
              {t('resourceadm.migration_not_published')}
            </Alert>
          )}
          {isPublishedInEnv && numberOfA2Delegations?.numberOfDelegations === 0 && (
            <Alert severity='success' size='sm'>
              {t('resourceadm.migration_not_needed')}
            </Alert>
          )}
          {migrateDelegationsError && (
            <Alert severity='danger' size='small'>
              {isErrorForbidden(migrateDelegationsError)
                ? t('resourceadm.migration_no_migration_access')
                : t('resourceadm.migration_post_migration_failed')}
            </Alert>
          )}
        </div>
        <StudioButton
          aria-disabled={!isPublishedInEnv || isSettingMigrateDelegations}
          onClick={() => {
            if (isPublishedInEnv && !isSettingMigrateDelegations) {
              setServiceExpiredWarningModalRef.current?.showModal();
            }
          }}
        >
          {t('resourceadm.migration_migrate_environment', { env: t(env.label) })}
        </StudioButton>
      </div>
    </>
  );
};