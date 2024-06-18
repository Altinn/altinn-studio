import React from 'react';
import { Popover } from '@mui/material';
import { dataModelUploadPagePath, repositoryGitPath } from 'app-shared/api/paths';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import classes from './CloneModal.module.css';
import { LegacyTextField, Link } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { useDataModelsXsdQuery } from 'app-shared/hooks/queries';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { InformationSquareFillIcon } from '@studio/icons';
import { StudioButton, StudioLabelAsParagraph } from '@studio/components';

export type CloneModalProps = {
  anchorEl: Element;
  onClose: any;
};

export const CloneModal = ({ anchorEl, onClose }: CloneModalProps) => {
  const { org, app } = useStudioEnvironmentParams();

  const gitUrl = window.location.origin.toString() + repositoryGitPath(org, app);

  const copyGitUrl = () => navigator.clipboard.writeText(gitUrl);
  const canCopy = document.queryCommandSupported ? document.queryCommandSupported('copy') : false;
  const { data: dataModel = [] } = useDataModelsXsdQuery(org, app);
  const { t } = useTranslation();
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
        <StudioLabelAsParagraph>{t('sync_header.favourite_tool')}</StudioLabelAsParagraph>
        <Link href={altinnDocsUrl('/nb')} target='_blank' rel='noopener noreferrer'>
          {t('sync_header.favourite_tool_link')}
        </Link>
        {
          /*dataModel.length*/ 0 === 0 && (
            <>
              <div className={classes.blackText}>
                <InformationSquareFillIcon className={classes.infoIcon} />
                {t('sync_header.data_model_missing')}
              </div>
              <div className={classes.blackText}>{t('sync_header.data_model_missing_helper')}</div>
              <Link href={dataModelUploadPagePath(org, app)}>
                {t('sync_header.data_model_missing_link')}
              </Link>
            </>
          )
        }
        <div className={classes.blackText}>{t('sync_header.clone_https')}</div>
        <LegacyTextField id='repository-url-form' value={gitUrl} readOnly />
        {canCopy && (
          <StudioButton onClick={copyGitUrl} id='copy-repository-url-button' size='small'>
            {t('sync_header.clone_https_button')}
          </StudioButton>
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
