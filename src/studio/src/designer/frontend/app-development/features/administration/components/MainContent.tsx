import { createTheme, makeStyles } from '@material-ui/core';
import * as React from 'react';
import { getLanguageFromKey } from 'app-shared/utils/language';
import AltinnInputField from 'app-shared/components/AltinnInputField';
import altinnTheme from 'app-shared/theme/altinnStudioTheme';
import AltinnPopper from 'app-shared/components/AltinnPopper';

export interface IMainContentProps {
  service: any;
  serviceName: string;
  serviceId: string;
  serviceDescription: string;
  language: any;
  editServiceName: boolean;
  serviceNameAnchorEl: any;
  onServiceNameChanged: (event: any) => void;
  onBlurServiceName: () => void;
  handleEditServiceName: () => void;
  onServiceIdChanged: (event: any) => void;
  onBlurServiceId: () => void;
  onServiceDescriptionChanged: (event: any) => void;
  onBlurServiceDescription: () => void;
}

const theme = createTheme(altinnTheme);

const setupClasses = makeStyles({
  marginBottom_24: {
    marginBottom: 24,
  },
});

const MainContent = (props: IMainContentProps): JSX.Element => {
  const classes = setupClasses();
  return (
    <>
      <div className={classes.marginBottom_24}>
        <AltinnInputField
          id='administrationInputServicename'
          textFieldId='administrationInputServicename_textField'
          onChangeFunction={props.onServiceNameChanged}
          inputHeader={getLanguageFromKey('general.service_name', props.language)}
          // eslint-disable-next-line max-len
          inputDescription={getLanguageFromKey('administration.service_name_administration_description', props.language)}
          inputValue={props.serviceName}
          onBlurFunction={props.onBlurServiceName}
          btnText={getLanguageFromKey('general.edit', props.language)}
          onBtnClickFunction={props.handleEditServiceName}
          isDisabled={!props.editServiceName}
          focusOnComponentDidUpdate={props.editServiceName}
          inputHeaderStyling={{ fontSize: 20, fontWeight: 500 }}
          inputFieldStyling={props.editServiceName ?
            { background: theme.altinnPalette.primary.white } : null}
        />
      </div>
      <AltinnPopper
        anchorEl={props.serviceNameAnchorEl}
        message={getLanguageFromKey('administration.service_name_empty_message', props.language)}
      />
      <div className={classes.marginBottom_24}>
        <AltinnInputField
          id='administrationInputServiceid'
          textFieldId='administrationInputServiceid_textField'
          onChangeFunction={props.onServiceIdChanged}
          inputHeader={getLanguageFromKey('administration.service_id', props.language)}
          // eslint-disable-next-line max-len
          inputDescription={getLanguageFromKey('administration.service_id_description', props.language)}
          inputValue={props.serviceId}
          onBlurFunction={props.onBlurServiceId}
          inputHeaderStyling={{ fontSize: 20, fontWeight: 500 }}
        />
      </div>
      <div className={classes.marginBottom_24}>
        <AltinnInputField
          id='administrationInputReponame'
          inputHeader={getLanguageFromKey('general.service_saved_name', props.language)}
          // eslint-disable-next-line max-len
          inputDescription={getLanguageFromKey('administration.service_saved_name_administration_description', props.language)}
          inputValue={props.service ? props.service.name : ''}
          isDisabled={true}
          inputHeaderStyling={{ fontSize: 20, fontWeight: 500 }}
        />
      </div>
      <div className={classes.marginBottom_24}>
        <AltinnInputField
          id='administrationInputDescription'
          textFieldId='administrationInputDescription_textField'
          onChangeFunction={props.onServiceDescriptionChanged}
          inputHeader={getLanguageFromKey('administration.service_comment', props.language)}
          // eslint-disable-next-line max-len
          inputDescription={getLanguageFromKey('administration.service_comment_description', props.language)}
          textAreaRows={7}
          inputValue={props.serviceDescription}
          onBlurFunction={props.onBlurServiceDescription}
          inputHeaderStyling={{ fontSize: 20, fontWeight: 500 }}
        />
      </div>
    </>
  );
};

export default MainContent;
