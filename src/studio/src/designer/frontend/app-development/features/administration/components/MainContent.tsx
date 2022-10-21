import React from 'react';
import { createTheme, Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';
import {
  getLanguageFromKey,
  getParsedLanguageFromKey,
} from 'app-shared/utils/language';
import AltinnInputField from 'app-shared/components/AltinnInputField';
import altinnTheme from 'app-shared/theme/altinnStudioTheme';
import AltinnPopper from 'app-shared/components/AltinnPopper';
import AltinnInformationPaper from 'app-shared/components/AltinnInformationPaper';
import type { IRepository } from '../../../types/global';
import { useAppSelector } from 'common/hooks';

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

const theme = createTheme(altinnTheme);

const setupClasses = makeStyles({
  marginBottom_24: {
    marginBottom: 24,
  },
});

const MainContent = (props: IMainContentProps): JSX.Element => {
  const classes = setupClasses();
  const urlParams = new URLSearchParams(
    `?${window.location.hash.split('?')[1]}`,
  );
  const copiedApp = Boolean(urlParams.get('copiedApp'));
  const language = useAppSelector((state) => state.languageState.language);

  return (
    <>
      <div className={classes.marginBottom_24}>
        {copiedApp && (
          <div
            className={classes.marginBottom_24}
            style={{ maxWidth: '750px' }}
          >
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
          </div>
        )}
        <AltinnInputField
          id='administrationInputAppName'
          textFieldId='administrationInputAppName_textField'
          onChangeFunction={props.onAppNameChange}
          inputHeader={getLanguageFromKey(
            'general.service_name',
            props.language,
          )}
          inputDescription={getLanguageFromKey(
            'administration.service_name_administration_description',
            props.language,
          )}
          inputValue={props.appName}
          onBlurFunction={props.onAppNameBlur}
          btnText={getLanguageFromKey('general.edit', props.language)}
          onBtnClickFunction={props.onEditAppNameClick}
          isDisabled={!props.editAppName}
          focusOnComponentDidUpdate={props.editAppName}
          inputHeaderStyling={{ fontSize: 20, fontWeight: 500 }}
          inputFieldStyling={
            props.editAppName
              ? { background: theme.altinnPalette.primary.white }
              : null
          }
        />
      </div>
      <AltinnPopper
        anchorEl={props.appNameAnchorEl}
        message={getLanguageFromKey(
          'administration.service_name_empty_message',
          props.language,
        )}
      />
      <div className={classes.marginBottom_24}>
        <AltinnInputField
          id='administrationInputAppId'
          textFieldId='administrationInputAppId_textField'
          onChangeFunction={props.onAppIdChange}
          inputHeader={getLanguageFromKey(
            'administration.service_id',
            props.language,
          )}
          inputDescription={getLanguageFromKey(
            'administration.service_id_description',
            props.language,
          )}
          inputValue={props.appId}
          onBlurFunction={props.onAppIdBlur}
          inputHeaderStyling={{ fontSize: 20, fontWeight: 500 }}
        />
      </div>
      <div className={classes.marginBottom_24}>
        <AltinnInputField
          id='administrationInputReponame'
          inputHeader={getLanguageFromKey(
            'general.service_saved_name',
            props.language,
          )}
          inputDescription={getLanguageFromKey(
            'administration.service_saved_name_administration_description',
            props.language,
          )}
          inputValue={props.repository ? props.repository.name : ''}
          isDisabled={true}
          inputHeaderStyling={{ fontSize: 20, fontWeight: 500 }}
        />
      </div>
      <div className={classes.marginBottom_24}>
        <AltinnInputField
          id='administrationInputDescription'
          textFieldId='administrationInputDescription_textField'
          onChangeFunction={props.onAppDescriptionChange}
          inputHeader={getLanguageFromKey(
            'administration.service_comment',
            props.language,
          )}
          inputDescription={getLanguageFromKey(
            'administration.service_comment_description',
            props.language,
          )}
          textAreaRows={7}
          inputValue={props.appDescription}
          onBlurFunction={props.onAppDescriptionBlur}
          inputHeaderStyling={{ fontSize: 20, fontWeight: 500 }}
        />
      </div>
    </>
  );
};

export default MainContent;
