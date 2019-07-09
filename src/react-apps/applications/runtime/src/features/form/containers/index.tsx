import * as React from 'react';
import AttachmentActions from '../../../sharedResources/attachments/attachmentActions';
import LanguageActions from '../../../sharedResources/language/languageActions';
import ProfileActions from '../../../sharedResources/profile/profileActions';
import FormDataActions from '../data/actions';
import FormDataModelActions from '../datamodell/actions';
import FormDynamicActions from '../dynamics/actions';
import FormLayoutActions from '../layout/actions';
import FormResourceActions from '../resources/actions';
import FormRuleActions from '../rules/actions';
import FormWorkflowActions from '../workflow/actions';
import FormFiller from './FormFiller';

import { IAltinnWindow } from '../../../types';

export default (props) => {
  const {
    match: {
      params: {
        instanceId,
      },
    },
  } = props;

  (window as IAltinnWindow).instanceId = instanceId;

  React.useEffect(() => {
    const { org, service, reportee } = window as IAltinnWindow;
    LanguageActions.fetchLanguage(
      `${window.location.origin}/${org}/${service}/api/Language/GetLanguageAsJSON`,
      'nb',
    );
    FormDataModelActions.fetchDataModel(
      `${window.location.origin}/${org}/${service}/api/metadata/ServiceMetaData`,
    );
    FormLayoutActions.fetchFormLayout(
      `${window.location.origin}/${org}/${service}/api/resource/FormLayout.json`,
    );
    FormDataActions.fetchFormData(
      `${window.location.origin}/${org}/${service}/api/${reportee}/Index/${instanceId}`,
    );
    FormRuleActions.fetchRuleModel(
      `${window.location.origin}/${org}/${service}/api/resource/RuleHandler.js`,
    );
    FormWorkflowActions.getCurrentState(
      // tslint:disable-next-line:max-line-length
      `${window.location.origin}/${org}/${service}/api/workflow/${reportee}/GetCurrentState?instanceId=${instanceId}`,
    );

    FormDynamicActions.fetchFormDynamics(
      `${window.location.origin}/${org}/${service}/api/resource/ServiceConfigurations.json`,
    );
    FormResourceActions.fetchFormResource(
      `${window.location.origin}/${org}/${service}/api/textresources`,
    );

    ProfileActions.fetchProfile(
      `${window.location.origin}/${org}/${service}/api/v1/profile/user`,
    );

    AttachmentActions.fetchAttachments();

  }, []);
  return (
    <FormFiller />
  );
};
