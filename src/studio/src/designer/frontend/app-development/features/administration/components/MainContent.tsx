import React from 'react';
import { Typography } from '@mui/material';
import { Button, TextArea, TextField } from '@altinn/altinn-design-system';
import {
  getLanguageFromKey,
  getParsedLanguageFromKey,
} from 'app-shared/utils/language';
import AltinnPopper from 'app-shared/components/AltinnPopper';
import AltinnInformationPaper from 'app-shared/components/AltinnInformationPaper';
import type { IRepository } from '../../../types/global';
import { useAppSelector } from 'common/hooks';
import classes from './MainContent.module.css';

interface IMainContentProps {
  repository: IRepository;
  appDescription: string;
  appId: string;
  appName: string;
  editAppName: boolean;
  language: any;
  onAppDescriptionBlur: () => void;
  onAppDescriptionChange: (event: any) => void;
  onAppIdBlur: () => void;
  onAppIdChange: (event: any) => void;
  onAppNameBlur: () => void;
  onAppNameChange: (event: any) => void;
  onEditAppNameClick: () => void;
  appNameAnchorEl: any;
}

const MainContent = (props: IMainContentProps): JSX.Element => {
  const urlParams = new URLSearchParams(
    `?${window.location.hash.split('?')[1]}`,
  );
  const copiedApp = Boolean(urlParams.get('copiedApp'));
  const language = useAppSelector((state) => state.languageState.language);

  return (
    <div className={classes.mainContentContainer}>
      {copiedApp && (
        <>
          <AltinnInformationPaper>
            <Typography variant='h2' sx={{ marginBottom: '12px' }}>
              {getParsedLanguageFromKey(
                'administration.copied_app_header',
                language,
                [],
              )}
            </Typography>
            <Typography variant='body1'>
              {getParsedLanguageFromKey(
                'administration.copied_app_information',
                language,
                [],
              )}
            </Typography>
          </AltinnInformationPaper>
        </>
      )}
      <Typography variant={'h2'}>
        {getLanguageFromKey('general.service_name', props.language)}
      </Typography>
      <p>
        {getLanguageFromKey(
          'administration.service_name_administration_description',
          props.language,
        )}
      </p>

      <div className={classes.sideBySide}>
        <TextField
          id='administrationInputAppName_textField'
          onValueChange={props.onAppNameChange}
          value={props.appName}
          onBlur={props.onAppNameBlur}
          disabled={!props.editAppName}
        />
        <Button onClick={props.onEditAppNameClick}>
          {getLanguageFromKey('general.edit', props.language)}
        </Button>
      </div>

      <AltinnPopper
        anchorEl={props.appNameAnchorEl}
        message={getLanguageFromKey(
          'administration.service_name_empty_message',
          props.language,
        )}
      />

      <Typography variant={'h2'}>
        {getLanguageFromKey('administration.service_id', props.language)}
      </Typography>
      <p>
        {getLanguageFromKey(
          'administration.service_id_description',
          props.language,
        )}
      </p>
      <TextField
        id='administrationInputAppId_textField'
        onValueChange={props.onAppIdChange}
        value={props.appId}
        onBlur={props.onAppIdBlur}
      />

      <Typography variant={'h2'}>
        {getLanguageFromKey('general.service_saved_name', props.language)}
      </Typography>
      <p>
        {getLanguageFromKey(
          'administration.service_saved_name_administration_description',
          props.language,
        )}
      </p>
      <TextField
        id='administrationInputReponame'
        value={props.repository ? props.repository.name : ''}
        disabled={true}
      />

      <Typography variant={'h2'}>
        {getLanguageFromKey('administration.service_comment', props.language)}
      </Typography>
      <p>
        {getLanguageFromKey(
          'administration.service_comment_description',
          props.language,
        )}
      </p>
      <TextArea
        id='administrationInputDescription_textField'
        onChange={props.onAppDescriptionChange}
        rows={7}
        value={props.appDescription}
        onBlur={props.onAppDescriptionBlur}
      />
    </div>
  );
};

export default MainContent;
