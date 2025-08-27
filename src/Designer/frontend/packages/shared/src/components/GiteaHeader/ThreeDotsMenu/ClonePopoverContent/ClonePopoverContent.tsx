import React from 'react';
import { repositoryGitPath } from 'app-shared/api/paths';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import classes from './ClonePopoverContent.module.css';
import { Link, Paragraph } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';
import { useDataModelsXsdQuery } from 'app-shared/hooks/queries';
import { InformationSquareFillIcon } from 'libs/studio-icons/src';
import { StudioButton, StudioLabelAsParagraph, StudioTextfield } from '@studio/components-legacy';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import { useGiteaHeaderContext } from '../../context/GiteaHeaderContext';

export const ClonePopoverContent = () => {
  const { owner, repoName } = useGiteaHeaderContext();
  const { data: dataModel = [] } = useDataModelsXsdQuery(owner, repoName);
  const { t } = useTranslation();
  const packagesRouter = new PackagesRouter({ app: repoName, org: owner });

  const gitUrl = window.location.origin.toString() + repositoryGitPath(owner, repoName);
  const copyGitUrl = () => navigator.clipboard.writeText(gitUrl);
  const canCopy = navigator.clipboard ? true : false;

  return (
    <div className={classes.modalContainer}>
      <StudioLabelAsParagraph size='small' spacing>
        {t('sync_header.favourite_tool')}
      </StudioLabelAsParagraph>
      <Paragraph asChild size='small'>
        <Link
          className={classes.link}
          href={altinnDocsUrl({ language: 'nb' })}
          target='_blank'
          rel='noopener noreferrer'
        >
          {t('sync_header.favourite_tool_link')}
        </Link>
      </Paragraph>
      {dataModel.length === 0 && (
        <>
          <div className={classes.iconAndText}>
            <InformationSquareFillIcon className={classes.infoIcon} />
            <Paragraph size='small'>{t('sync_header.data_model_missing')}</Paragraph>
          </div>
          <Paragraph size='small' spacing>
            {t('sync_header.data_model_missing_helper')}
          </Paragraph>
          <Paragraph size='small' asChild>
            <Link
              className={classes.link}
              href={packagesRouter.getPackageNavigationUrl('dataModel')}
            >
              {t('sync_header.data_model_missing_link')}
            </Link>
          </Paragraph>
        </>
      )}
      <StudioTextfield readOnly value={gitUrl} label={t('sync_header.clone_https')} />
      {canCopy && (
        <div className={classes.buttonWrapper}>
          <StudioButton fullWidth onClick={copyGitUrl} className={classes.button}>
            {t('sync_header.clone_https_button')}
          </StudioButton>
        </div>
      )}
    </div>
  );
};
