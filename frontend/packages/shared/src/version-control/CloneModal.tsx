import React, { useEffect, useState } from 'react';
import { Popover } from '@mui/material';
import axios from 'axios';
import AltinnIcon from '../components/AltinnIcon';
import { getLanguageFromKey } from '../utils/language';
import { get } from '../utils/networking';
import { altinnDocsUrl, dataModelUploadPageUrl } from '../utils/urlHelper';
import { datamodelXsdPath, repositoryGitPath } from '../api-paths';
import { useParams } from 'react-router-dom';
import { SimpleContainer } from '../primitives';
import classes from './CloneModal.module.css';
import { Button, TextField } from '@altinn/altinn-design-system';

export interface ICloneModalProps {
  anchorEl: Element;
  onClose: any;
  language: any;
}

export function CloneModal(props: ICloneModalProps) {
  const [hasDataModel, setHasDataModel] = useState(false);

  const copyGitUrl = () => {
    const textField = document.querySelector('#repository-url');
    (textField as any).select();
    document.execCommand('copy');
  };

  const canCopy = () => {
    if (document.queryCommandSupported) {
      return document.queryCommandSupported('copy');
    }
    return false;
  };
  const { org, app } = useParams();
  useEffect(() => {
    const source = axios.CancelToken.source();
    const checkIfDataModelExists = async () => {
      try {
        const dataModel: any = await get(datamodelXsdPath(org, app), {
          cancelToken: source.token,
        });
        setHasDataModel(dataModel != null);
      } catch (err) {
        if (!axios.isCancel(err)) {
          setHasDataModel(false);
        }
      }
    };
    checkIfDataModelExists().then();
    return () => {
      source.cancel('Component got unmounted.');
    };
  }, [app, org]);
  const t = (key: string) => getLanguageFromKey(key, props.language);
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
        <a href={altinnDocsUrl} target='_blank' rel='noopener noreferrer'>
          {t('sync_header.favourite_tool_link')}
        </a>
        {!hasDataModel && (
          <>
            <div className={classes.blackText}>
              <AltinnIcon
                iconClass='ai ai-circle-exclamation'
                iconColor='#0062BA'
                iconSize={30}
                padding='0px 0px 3px 0px'
              />
              {t('sync_header.data_model_missing')}
            </div>
            <div className={classes.blackText}>{t('sync_header.data_model_missing_helper')}</div>
            <a href={dataModelUploadPageUrl(org, app)}>
              {t('sync_header.data_model_missing_link')}
            </a>
          </>
        )}
        <>
          <div className={classes.blackText}>{t('sync_header.clone_https')}</div>
          <TextField id='repository-url-form' value={repositoryGitPath(org, app)} readOnly />
        </>
        {canCopy() && (
          <Button onClick={copyGitUrl} id='copy-repository-url-button'>
            {t('sync_header.clone_https_button')}
          </Button>
        )}
      </SimpleContainer>
    </Popover>
  );
}
