import * as React from 'react';
import FormFiller from './containers/FormFiller';
import FormDataActions from './features/form/data/actions';
import FormDataModelActions from './features/form/datamodell/actions';
import FormDynamicActions from './features/form/dynamics/actions';
import FormFileUploadActions from './features/form/fileUpload/actions';
import FormLayoutActions from './features/form/layout/actions';
import FormResourceActions from './features/form/resources/actions';
import FormRuleActions from './features/form/rules/actions';
import FormUserActions from './features/form/user/actions';
import FormWorkflowActions from './features/form/workflow/actions';
import LanguageActions from './features/languages/actions';

import { IAltinnWindow } from './types';

export default () => {
  React.useEffect(() => {
    const { org, service, instanceId, reportee } = window as IAltinnWindow;
    LanguageActions.fetchLanguage(
      `${window.location.origin}/runtime/api/Language/GetLanguageAsJSON`,
      'nb',
    );
    FormDataModelActions.fetchDataModel(
      `${window.location.origin}/runtime/api/metadata/${org}/${service}/ServiceMetaData`,
    );
    FormLayoutActions.fetchFormLayout(
      `${window.location.origin}/runtime/api/resource/${org}/${service}/FormLayout.json`,
    );
    FormDataActions.fetchFormData(
      `${window.location.origin}/runtime/api/${reportee}/${org}/${service}/Index/${instanceId}`,
    );
    FormRuleActions.fetchRuleModel(
      `${window.location.origin}/runtime/api/resource/${org}/${service}/RuleHandler.js`,
    );
    FormWorkflowActions.getCurrentState(
      // tslint:disable-next-line:max-line-length
      `${window.location.origin}/runtime/api/workflow/${reportee}/${org}/${service}/GetCurrentState?instanceId=${instanceId}`,
    );

    FormDynamicActions.fetchFormDynamics(
      `${window.location.origin}/runtime/api/resource/${org}/${service}/ServiceConfigurations.json`,
    );
    FormResourceActions.fetchFormResource(
      `${window.location.origin}/runtime/api/textresources/${org}/${service}`,
    );
    FormUserActions.fetchFormUser(
      `${window.location.origin}/runtime/api/v1/profile/user`,
    );

    FormFileUploadActions.fetchAttachments();

  }, []);
  return (
    <FormFiller />
  );
};
