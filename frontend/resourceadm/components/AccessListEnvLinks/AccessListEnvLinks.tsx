import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Button, List, Paragraph } from '@digdir/design-system-react';
import { getResourcePageURL } from '../../utils/urlUtils';
import { useUrlParams } from '../../hooks/useSelectedContext';
import { getAvailableEnvironments } from '../../utils/resourceUtils';
import { useResourcePolicyPublishStatusQuery } from '../../hooks/queries';
import { StudioSpinner } from '@studio/components';
import { ArrowForwardIcon } from '@studio/icons';
import classes from './AccessListEnvLinks.module.css';

export const AccessListEnvLinks = (): React.JSX.Element => {
  const { t } = useTranslation();
  const { resourceId, selectedContext, repo } = useUrlParams();

  const { data: publishStatusData, isLoading: isLoadingPublishStatus } =
    useResourcePolicyPublishStatusQuery(selectedContext, repo, resourceId);

  const envPublishStatus = getAvailableEnvironments(selectedContext).map((env) => {
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
            <Alert severity='warning'>
              <Paragraph size='small' spacing>
                {t('resourceadm.about_resource_rrr_publish_warning')}
              </Paragraph>
              <List.Root size='small'>
                <List.Unordered>
                  {envPublishStatus
                    .filter((env) => !env.isResourcePublished)
                    .map((env) => (
                      <List.Item key={env.id}>{t(env.label)}</List.Item>
                    ))}
                </List.Unordered>
              </List.Root>
            </Alert>
          )}
          {envPublishStatus
            .filter((env) => env.isResourcePublished)
            .map((env) => {
              return (
                <Button key={env.id} variant='tertiary' size='small' asChild>
                  <Link
                    to={`${getResourcePageURL(selectedContext, repo, resourceId, 'accesslists')}/${env.id}/`}
                  >
                    <ArrowForwardIcon />
                    {t('resourceadm.about_resource_edit_rrr', { env: t(env.label) })}
                  </Link>
                </Button>
              );
            })}
        </>
      )}
    </div>
  );
};
