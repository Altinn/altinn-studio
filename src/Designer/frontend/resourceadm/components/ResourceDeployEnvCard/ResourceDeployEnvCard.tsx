import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import classes from './ResourceDeployEnvCard.module.css';
import { ArrowRightIcon } from '@studio/icons';
import {
  StudioAlert,
  StudioButton,
  StudioParagraph,
  StudioSpinner,
  StudioTag,
} from '@studio/components';
import { usePublishResourceMutation } from '../../hooks/mutations';
import { useUrlParams } from '../../hooks/useUrlParams';
import type { ResourceError } from 'app-shared/types/ResourceAdm';
import { getEnvLabel, type EnvId } from '../../utils/resourceUtils/resourceUtils';

export type ResourceDeployEnvCardProps = {
  isDeployPossible: boolean;
  env: EnvId;
  currentEnvVersion: string;
  newEnvVersion?: string;
};

/**
 * @component
 *    Component for the card displaying the button for publishing the resource
 *    to an environment and information about the resource version
 *
 * @property {boolean}[isDeployPossible] - Flag for if deploy is possible or not
 * @property {EnvId}[env] - The ID of the environment
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

  const [hasNoPublishAccess, setHasNoPublishAccess] = useState<boolean>(false);
  const { org, app, resourceId } = useUrlParams();

  // Query function for publishing a resource
  const { mutate: publishResource, isPending: publisingResourcePending } =
    usePublishResourceMutation(org, app, resourceId);

  const handlePublish = () => {
    publishResource(env, {
      onSuccess: () => {
        toast.success(
          t('resourceadm.resource_published_success', { envName: t(getEnvLabel(env)) }),
        );
      },
      onError: (error: Error) => {
        if ((error as ResourceError).response?.status === 403) {
          setHasNoPublishAccess(true);
        }
      },
    });
  };

  return (
    <div className={classes.cardWrapper}>
      {publisingResourcePending ? (
        <StudioSpinner aria-label={t('resourceadm.deploy_deploying')}></StudioSpinner>
      ) : (
        <>
          <StudioParagraph>
            <strong>{t(getEnvLabel(env))}</strong>
          </StudioParagraph>
          <StudioParagraph>{t('resourceadm.deploy_version_number_text')}</StudioParagraph>
          <div className={classes.envWrapper}>
            <StudioTag data-color='neutral'>{currentEnvVersion}</StudioTag>
            {newEnvVersion && (
              <>
                <ArrowRightIcon
                  title={t('resourceadm.deploy_card_arrow_icon', { env: t(getEnvLabel(env)) })}
                  fontSize='1.5rem'
                />
                <StudioTag data-color='success'>{newEnvVersion}</StudioTag>
              </>
            )}
          </div>
          <StudioButton disabled={!isDeployPossible || hasNoPublishAccess} onClick={handlePublish}>
            {t('resourceadm.deploy_card_publish', { env: t(getEnvLabel(env)) })}
          </StudioButton>
          {hasNoPublishAccess && (
            <StudioAlert data-color='danger'>
              <StudioParagraph>
                {t('resourceadm.resource_publish_no_access', { envName: t(getEnvLabel(env)) })}
              </StudioParagraph>
            </StudioAlert>
          )}
        </>
      )}
    </div>
  );
};
