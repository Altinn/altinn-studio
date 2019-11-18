import * as React from 'react';
import InstanceDataActions from '../../../shared/resources/instanceData/instanceDataActions';
import LanguageActions from '../../../shared/resources/language/languageActions';
import ProcessDispatcher from '../../../shared/resources/process/processDispatcher';
import ProfileActions from '../../../shared/resources/profile/profileActions';
import { IAltinnWindow } from '../../../types';
import FormDataActions from '../data/actions';
import FormDataModelActions from '../datamodell/actions';
import FormDynamicActions from '../dynamics/actions';
import FormLayoutActions from '../layout/actions';
import FormRuleActions from '../rules/actions';
import FormFiller from './FormFiller';

export default (props) => {
  const {
    match: {
      params: {
        partyId,
        instanceGuid,
      },
    },
  } = props;

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
      `${window.location.origin}/${org}/${app}/api/${instanceId}`,
    );
    FormRuleActions.fetchRuleModel(
      `${window.location.origin}/${org}/${app}/api/resource/RuleHandler.js`,
    );

    ProcessDispatcher.getProcessState();

    InstanceDataActions.getInstanceData(partyId, instanceGuid);

    FormDynamicActions.fetchFormDynamics(
      `${window.location.origin}/${org}/${app}/api/resource/ServiceConfigurations.json`,
    );

    ProfileActions.fetchProfile(
      `${window.location.origin}/${org}/${app}/api/v1/profile/user`,
    );

  }, []);

  return (
    <FormFiller />
  );
};
