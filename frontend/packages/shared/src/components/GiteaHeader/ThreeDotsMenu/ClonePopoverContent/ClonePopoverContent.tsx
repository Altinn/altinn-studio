import React from 'react';
import { repositoryGitPath } from 'app-shared/api/paths';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import classes from './ClonePopoverContent.module.css';
import { Link, Paragraph } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { useDataModelsXsdQuery } from 'app-shared/hooks/queries';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { InformationSquareFillIcon } from '@studio/icons';
import { StudioButton, StudioLabelAsParagraph, StudioTextfield } from '@studio/components';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';

export type ClonePopoverContentProps = {
  onClose: () => void;
};

export const ClonePopoverContent = ({ onClose }: ClonePopoverContentProps) => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: dataModel = [] } = useDataModelsXsdQuery(org, app);
  const { t } = useTranslation();
  const packagesRouter = new PackagesRouter({ app, org });

  const gitUrl = window.location.origin.toString() + repositoryGitPath(org, app);
  const copyGitUrl = () => navigator.clipboard.writeText(gitUrl);
  const canCopy = navigator.clipboard ? true : false;

  return (
    <div className={classes.modalContainer}>
      <StudioLabelAsParagraph size='small' spacing>
        {t('sync_header.favourite_tool')}
      </StudioLabelAsParagraph>
      <Link
        className={classes.link}
        size='small'
        href={altinnDocsUrl('/nb')}
        target='_blank'
        rel='noopener noreferrer'
      >
        {t('sync_header.favourite_tool_link')}
      </Link>
      {dataModel.length === 0 && (
        <>
          <div className={classes.iconAndText}>
            <InformationSquareFillIcon className={classes.infoIcon} />
            <Paragraph size='small'>{t('sync_header.data_model_missing')}</Paragraph>
          </div>
          <Paragraph size='small' spacing>
            {t('sync_header.data_model_missing_helper')}
          </Paragraph>
          <Link
            className={classes.link}
            size='small'
            href={packagesRouter.getPackageNavigationUrl('dataModel')}
          >
            {t('sync_header.data_model_missing_link')}
          </Link>
        </>
      )}
      <StudioTextfield readOnly value={gitUrl} label={t('sync_header.clone_https')} size='small' />
      {canCopy && (
        <div className={classes.buttonWrapper}>
          <StudioButton fullWidth onClick={copyGitUrl} className={classes.button} size='small'>
            {t('sync_header.clone_https_button')}
          </StudioButton>
        </div>
      )}
    </div>
  );
};
