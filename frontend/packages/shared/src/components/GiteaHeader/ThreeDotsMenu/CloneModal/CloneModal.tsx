import React from 'react';
import { Popover } from '@mui/material';
import { repositoryGitPath } from 'app-shared/api/paths';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import classes from './CloneModal.module.css';
import { Link, Paragraph } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { useDataModelsXsdQuery } from 'app-shared/hooks/queries';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { InformationSquareFillIcon } from '@studio/icons';
import { StudioButton, StudioLabelAsParagraph, StudioTextfield } from '@studio/components';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';

export type CloneModalProps = {
  anchorEl: Element;
  onClose: any;
};

export const CloneModal = ({ anchorEl, onClose }: CloneModalProps) => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: dataModel = [] } = useDataModelsXsdQuery(org, app);
  const { t } = useTranslation();
  const packagesRouter = new PackagesRouter({ app, org });

  // MOVE THESE TO UTILS
  const gitUrl = window.location.origin.toString() + repositoryGitPath(org, app);
  const copyGitUrl = () => navigator.clipboard.writeText(gitUrl);
  const canCopy = document.queryCommandSupported ? document.queryCommandSupported('copy') : false;

  const open = Boolean(anchorEl);

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
    >
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
        {
          /*dataModel.length*/ 0 === 0 && (
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
          )
        }
        <StudioTextfield
          readOnly
          value={gitUrl}
          label={t('sync_header.clone_https')}
          size='small'
        />
        {canCopy && (
          <div className={classes.buttonWrapper}>
            <StudioButton fullWidth onClick={copyGitUrl} className={classes.button} size='small'>
              {t('sync_header.clone_https_button')}
            </StudioButton>
          </div>
        )}
      </div>
    </Popover>
  );
};

/*
export interface ICloneModalProps {
  anchorEl: Element;
  onClose: any;
}

export const CloneModal = (props: ICloneModalProps) => {
  const { org, app } = useStudioEnvironmentParams();
  const gitUrl = window.location.origin.toString() + repositoryGitPath(org, app);
  const copyGitUrl = () => navigator.clipboard.writeText(gitUrl);
  const canCopy = document.queryCommandSupported ? document.queryCommandSupported('copy') : false;
  const { data: dataModel = [] } = useDataModelsXsdQuery(org, app);
  const { t } = useTranslation();
  const open = Boolean(props.anchorEl);
  return (
    <Popover
      open={open}
      anchorEl={props.anchorEl}
      onClose={props.onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
    >
      <SimpleContainer className={classes.modalContainer}>
        <div className={classes.blackText}>{t('sync_header.favourite_tool')}</div>
        <a href={altinnDocsUrl('')} target='_blank' rel='noopener noreferrer'>
          {t('sync_header.favourite_tool_link')}
        </a>
        {dataModel.length === 0 && (
          <>
            <div className={classes.blackText}>
              <InformationSquareFillIcon className={classes.infoIcon} />
              {t('sync_header.data_model_missing')}
            </div>
            <div className={classes.blackText}>{t('sync_header.data_model_missing_helper')}</div>
            <a href={dataModelUploadPagePath(org, app)}>
              {t('sync_header.data_model_missing_link')}
            </a>
          </>
        )}
        <>
          <div className={classes.blackText}>{t('sync_header.clone_https')}</div>
          <LegacyTextField id='repository-url-form' value={gitUrl} readOnly />
        </>
        {canCopy && (
          <StudioButton onClick={copyGitUrl} id='copy-repository-url-button' size='small'>
            {t('sync_header.clone_https_button')}
          </StudioButton>
        )}
      </SimpleContainer>
    </Popover>
  );
};
*/
