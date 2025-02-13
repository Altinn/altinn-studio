import React, { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { Tag, Paragraph, Spinner, Alert } from '@digdir/designsystemet-react';
import classes from './ResourceDeployEnvCard.module.css';
import { ArrowRightIcon } from '@studio/icons';
import { StudioButton, StudioModal } from '@studio/components';
import { usePublishResourceMutation } from '../../hooks/mutations';
import { type Environment } from '../../utils/resourceUtils';
import { useUrlParams } from '../../hooks/useUrlParams';
import type { ResourceError } from 'app-shared/types/ResourceAdm';

export type ResourceDeployEnvCardProps = {
  isDeployPossible: boolean;
  env: Environment;
  currentEnvVersion: string;
  newEnvVersion?: string;
};

/**
 * @component
 *    Component for the card displaying the button for publishing the resource
 *    to an environment and information about the resource version
 *
 * @property {boolean}[isDeployPossible] - Flag for if deploy is possible or not
 * @property {Environment}[env] - The name of the environment
 * @property {string}[currentEnvVersion] - The current version in the environment
 * @property {string}[newEnvVersion] - The new version the resource will deploy to
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const ResourceDeployEnvCard = ({
  isDeployPossible,
  env,
  currentEnvVersion,
  newEnvVersion,
}: ResourceDeployEnvCardProps): React.JSX.Element => {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDialogElement>(null);

  const [hasNoPublishAccess, setHasNoPublishAccess] = useState<boolean>(false);
  const { org, app, resourceId } = useUrlParams();

  // Query function for publishing a resource
  const { mutate: publishResource, isPending: publisingResourcePending } =
    usePublishResourceMutation(org, app, resourceId);

  const handlePublish = () => {
    if (env.id === 'prod') {
      modalRef.current.showModal();
    } else {
      onPublishResource();
    }
  };

  const onPublishResource = (): void => {
    onCloseWarningModal();
    publishResource(env.id, {
      onSuccess: () => {
        toast.success(t('resourceadm.resource_published_success', { envName: t(env.label) }));
      },
      onError: (error: Error) => {
        if ((error as ResourceError).response?.status === 403) {
          setHasNoPublishAccess(true);
        }
      },
    });
  };

  const onCloseWarningModal = () => {
    modalRef.current.close();
  };

  return (
    <div className={classes.cardWrapper}>
      <StudioModal.Root>
        <StudioModal.Dialog
          ref={modalRef}
          onClose={onCloseWarningModal}
          heading={t('resourceadm.prod_delete_modal_heading')}
          closeButtonTitle={t('resourceadm.close_modal')}
          footer={
            <>
              <StudioButton onClick={onPublishResource}>
                {t('resourceadm.prod_delete_modal_confirm')}
              </StudioButton>
              <StudioButton onClick={onCloseWarningModal} variant='tertiary'>
                {t('general.cancel')}
              </StudioButton>
            </>
          }
        >
          <Paragraph size='small'>{t('resourceadm.prod_delete_modal_body')}</Paragraph>
        </StudioModal.Dialog>
      </StudioModal.Root>
      {publisingResourcePending ? (
        <Spinner title={t('resourceadm.deploy_deploying')}></Spinner>
      ) : (
        <>
          <Paragraph size='small'>
            <strong>{t(env.label)}</strong>
          </Paragraph>
          <Paragraph size='small'>{t('resourceadm.deploy_version_number_text')}</Paragraph>
          <div className={classes.envWrapper}>
            <Tag color='neutral' size='small'>
              {currentEnvVersion}
            </Tag>
            {newEnvVersion && (
              <>
                <ArrowRightIcon
                  title={t('resourceadm.deploy_card_arrow_icon', { env: t(env.label) })}
                  fontSize='1.5rem'
                />
                <Tag color='success' size='small'>
                  {newEnvVersion}
                </Tag>
              </>
            )}
          </div>
          <StudioButton disabled={!isDeployPossible || hasNoPublishAccess} onClick={handlePublish}>
            {t('resourceadm.deploy_card_publish', { env: t(env.label) })}
          </StudioButton>
          {hasNoPublishAccess && (
            <Alert severity='danger'>
              <Paragraph size='small'>
                {t('resourceadm.resource_publish_no_access', { envName: t(env.label) })}
              </Paragraph>
            </Alert>
          )}
        </>
      )}
    </div>
  );
};
