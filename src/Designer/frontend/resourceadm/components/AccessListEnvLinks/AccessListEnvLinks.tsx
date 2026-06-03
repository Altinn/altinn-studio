import React from 'react';
import { useTranslation } from 'react-i18next';
import { getResourcePageURL } from '../../utils/urlUtils';
import { useUrlParams } from '../../hooks/useUrlParams';
import { useResourcePolicyPublishStatusQuery } from '../../hooks/queries';
import { StudioSpinner, StudioAlert, StudioParagraph, StudioList } from '@studio/components';
import { ArrowForwardIcon } from '@studio/icons';
import classes from './AccessListEnvLinks.module.css';
import { ButtonRouterLink } from 'app-shared/components/ButtonRouterLink';
import { type EnvId, getEnvLabel } from 'resourceadm/utils/resourceUtils';

export const AccessListEnvLinks = (): React.JSX.Element => {
  const { t } = useTranslation();
  const { resourceId, org, app } = useUrlParams();

  const { data: publishStatusData, isLoading: isLoadingPublishStatus } =
    useResourcePolicyPublishStatusQuery(org, app, resourceId);

  const envPublishStatus = publishStatusData.publishedVersions.map((version) => {
    return {
      id: version.environment as EnvId,
      isResourcePublished: !!version.version,
    };
  });

  return (
    <div className={classes.envButtonsWrapper}>
      {isLoadingPublishStatus && (
        <StudioSpinner aria-label={t('resourceadm.loading_publish_status')} />
      )}
      {publishStatusData && (
        <>
          {envPublishStatus.some((env) => !env.isResourcePublished) && (
            <StudioAlert data-color='warning'>
              <StudioParagraph spacing>
                {t('resourceadm.about_resource_rrr_publish_warning')}
              </StudioParagraph>
              <StudioList.Root data-size='sm'>
                <StudioList.Unordered>
                  {envPublishStatus
                    .filter((env) => !env.isResourcePublished)
                    .map((env) => (
                      <StudioList.Item key={env.id}>{t(getEnvLabel(env.id))}</StudioList.Item>
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
                  {t('resourceadm.about_resource_edit_rrr', { env: t(getEnvLabel(env.id)) })}
                </ButtonRouterLink>
              );
            })}
        </>
      )}
    </div>
  );
};
