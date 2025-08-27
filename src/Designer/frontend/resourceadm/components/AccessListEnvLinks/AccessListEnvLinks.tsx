import React from 'react';
import { useTranslation } from 'react-i18next';
import { getResourcePageURL } from '../../utils/urlUtils';
import { useUrlParams } from '../../hooks/useUrlParams';
import { getAvailableEnvironments } from '../../utils/resourceUtils';
import { useResourcePolicyPublishStatusQuery } from '../../hooks/queries';
import { StudioSpinner, StudioAlert, StudioList, StudioParagraph } from '@studio/components-legacy';
import { ArrowForwardIcon } from '@studio/icons';
import classes from './AccessListEnvLinks.module.css';
import { ButtonRouterLink } from 'app-shared/components/ButtonRouterLink';

export const AccessListEnvLinks = (): React.JSX.Element => {
  const { t } = useTranslation();
  const { resourceId, org, app } = useUrlParams();

  const { data: publishStatusData, isLoading: isLoadingPublishStatus } =
    useResourcePolicyPublishStatusQuery(org, app, resourceId);

  const envPublishStatus = getAvailableEnvironments(org).map((env) => {
    const isPublishedInEnv = publishStatusData?.publishedVersions.some(
      (version) => version.environment === env.id && version.version,
    );
    return {
      ...env,
      isResourcePublished: isPublishedInEnv,
    };
  });

  return (
    <div className={classes.envButtonsWrapper}>
      {isLoadingPublishStatus && (
        <StudioSpinner showSpinnerTitle spinnerTitle={t('resourceadm.loading_publish_status')} />
      )}
      {publishStatusData && (
        <>
          {envPublishStatus.some((env) => !env.isResourcePublished) && (
            <StudioAlert severity='warning'>
              <StudioParagraph size='sm' spacing>
                {t('resourceadm.about_resource_rrr_publish_warning')}
              </StudioParagraph>
              <StudioList.Root size='sm'>
                <StudioList.Unordered>
                  {envPublishStatus
                    .filter((env) => !env.isResourcePublished)
                    .map((env) => (
                      <StudioList.Item key={env.id}>{t(env.label)}</StudioList.Item>
                    ))}
                </StudioList.Unordered>
              </StudioList.Root>
            </StudioAlert>
          )}
          {envPublishStatus
            .filter((env) => env.isResourcePublished)
            .map((env) => {
              return (
                <ButtonRouterLink
                  icon={<ArrowForwardIcon />}
                  key={env.id}
                  to={`${getResourcePageURL(org, app, resourceId, 'accesslists')}/${env.id}/`}
                  variant='tertiary'
                >
                  {t('resourceadm.about_resource_edit_rrr', { env: t(env.label) })}
                </ButtonRouterLink>
              );
            })}
        </>
      )}
    </div>
  );
};
