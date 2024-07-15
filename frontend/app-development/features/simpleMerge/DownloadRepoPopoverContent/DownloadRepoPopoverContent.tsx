import React from 'react';
import classes from './DownloadRepoPopoverContent.module.css';
import { Trans, useTranslation } from 'react-i18next';
import { StudioButton } from '@studio/components';
import { repoDownloadPath } from 'app-shared/api/paths';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { Heading, Link, Paragraph } from '@digdir/designsystemet-react';

export type DownloadRepoPopoverContentProps = {
  onClose: () => void;
};

export const DownloadRepoPopoverContent = ({
  onClose,
}: DownloadRepoPopoverContentProps): React.ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();

  return (
    <div className={classes.wrapper}>
      <Heading level={2} spacing size='small'>
        {t('overview.download_repo_heading')}
      </Heading>
      <Paragraph spacing size='small'>
        <Trans i18nKey={'overview.download_repo_info'} />
      </Paragraph>
      <Link className={classes.link} href={repoDownloadPath(org, app)}>
        {t('overview.download_repo_changes')}
      </Link>
      <Link className={classes.link} href={repoDownloadPath(org, app, true)}>
        {t('overview.download_repo_full')}
      </Link>
      <div className={classes.buttonContainer}>
        <StudioButton color='second' onClick={onClose} variant='secondary' size='small'>
          {t('general.cancel')}
        </StudioButton>
      </div>
    </div>
  );
};
