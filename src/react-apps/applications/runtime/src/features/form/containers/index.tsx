import * as React from 'react';
import { useSelector } from 'react-redux';
import AttachmentActions from '../../../shared/resources/attachments/attachmentActions';
import LanguageActions from '../../../shared/resources/language/languageActions';
import ProfileActions from '../../../shared/resources/profile/profileActions';

import FormDataActions from '../data/actions';
import FormDataModelActions from '../datamodell/actions';
import FormDynamicActions from '../dynamics/actions';
import FormLayoutActions from '../layout/actions';
import FormRuleActions from '../rules/actions';
import FormWorkflowActions from '../workflow/actions';
import ProcessDispatcher from './../../../sharedResources/process/processDispatcher';
import FormFiller from './FormFiller';

import {
  appPath,
} from '../../../utils/urlHelper';

import { IAltinnWindow, IRuntimeState } from '../../../types';

export default (props) => {
  const {
    match: {
      params: {
        partyId,
        instanceGuid,
      },
    },
  } = props;

  // const process = useSelector((state: IRuntimeState) => state.process);

  (window as Window as IAltinnWindow).instanceId = partyId  + '/' + instanceGuid;

  React.useEffect(() => {
    const { org, app, instanceId } = window as Window as IAltinnWindow;
    LanguageActions.fetchLanguage(
      `${window.location.origin}/${org}/${app}/api/Language/GetLanguageAsJSON`,
      'nb',
    );
    FormDataModelActions.fetchDataModel(
      `${window.location.origin}/${org}/${app}/api/metadata/ServiceMetaData`,
    );
    FormLayoutActions.fetchFormLayout(
      `${window.location.origin}/${org}/${app}/api/resource/FormLayout.json`,
    );
    FormDataActions.fetchFormData(
      // `${window.location.origin}/${org}/${app}/api/${instanceId}`,
      `${appPath}/instances/${instanceId}/`,
    );
    FormRuleActions.fetchRuleModel(
      `${window.location.origin}/${org}/${app}/api/resource/RuleHandler.js`,
    );
// Old workflow, remove
    // FormWorkflowActions.getCurrentState(
    //   // tslint:disable-next-line:max-line-length
    //   `${window.location.origin}/${org}/${app}/api/workflow/${instanceId}/GetCurrentState`,
    // );

    // `${window.location.origin}/${org}/${app}/instances/${instanceId}/process`,

    ProcessDispatcher.getProcessState(
      instanceId,
    );

    FormDynamicActions.fetchFormDynamics(
      `${window.location.origin}/${org}/${app}/api/resource/ServiceConfigurations.json`,
    );

    ProfileActions.fetchProfile(
      `${window.location.origin}/${org}/${app}/api/v1/profile/user`,
    );

    AttachmentActions.fetchAttachments();

  }, []);
  // React.useEffect(() => {

  //   // do do do

  // }, [process]);
  return (
    <FormFiller />
  );
};
