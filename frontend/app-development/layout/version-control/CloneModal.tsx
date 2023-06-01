import React from 'react';
import { Popover } from '@mui/material';
import { AltinnIconComponent } from 'app-shared/components/AltinnIcon';
import { datamodelUploadPagePath, repositoryGitPath } from 'app-shared/api/paths';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import { useParams } from 'react-router-dom';
import { SimpleContainer } from 'app-shared/primitives';
import classes from './CloneModal.module.css';
import { Button, TextField } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { useDatamodelsXsdQuery } from '../../hooks/queries';

export interface ICloneModalProps {
  anchorEl: Element;
  onClose: any;
}

export function CloneModal(props: ICloneModalProps) {
  const { org, app } = useParams();
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
              <AltinnIconComponent
                iconClass='ai ai-circle-exclamation'
                iconColor='#0062BA'
                iconSize={30}
                padding='0px 0px 3px 0px'
              />
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
          <TextField id='repository-url-form' value={gitUrl} readOnly />
        </>
        {canCopy && (
          <Button onClick={copyGitUrl} id='copy-repository-url-button'>
            {t('sync_header.clone_https_button')}
          </Button>
        )}
      </SimpleContainer>
    </Popover>
  );
}
