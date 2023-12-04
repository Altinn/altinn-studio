import React from 'react';
import { Popover } from '@mui/material';
import { datamodelUploadPagePath, repositoryGitPath } from 'app-shared/api/paths';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import { SimpleContainer } from 'app-shared/primitives';
import classes from './CloneModal.module.css';
import { Button, LegacyTextField } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { useDatamodelsXsdQuery } from 'app-shared/hooks/queries';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { InformationSquareFillIcon } from '@altinn/icons';

export interface ICloneModalProps {
  anchorEl: Element;
  onClose: any;
}

export const CloneModal = (props: ICloneModalProps) => {
  const { org, app } = useStudioUrlParams();
  const gitUrl = window.location.origin.toString() + repositoryGitPath(org, app);
  const copyGitUrl = () => navigator.clipboard.writeText(gitUrl);
  const canCopy = document.queryCommandSupported ? document.queryCommandSupported('copy') : false;
  const { data: dataModel = [] } = useDatamodelsXsdQuery(org, app);
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
            <a href={datamodelUploadPagePath(org, app)}>
              {t('sync_header.data_model_missing_link')}
            </a>
          </>
        )}
        <>
          <div className={classes.blackText}>{t('sync_header.clone_https')}</div>
          <LegacyTextField id='repository-url-form' value={gitUrl} readOnly />
        </>
        {canCopy && (
          <Button onClick={copyGitUrl} id='copy-repository-url-button' size='small'>
            {t('sync_header.clone_https_button')}
          </Button>
        )}
      </SimpleContainer>
    </Popover>
  );
};
