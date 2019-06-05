import * as React from 'react';
import LanguageActions from '../../languages/actions';
import FormDataActions from '../data/actions';
import FormDataModelActions from '../datamodell/actions';
import FormDynamicActions from '../dynamics/actions';
import FormFileUploadActions from '../fileUpload/actions';
import FormLayoutActions from '../layout/actions';
import FormResourceActions from '../resources/actions';
import FormRuleActions from '../rules/actions';
import FormWorkflowActions from '../workflow/actions';
import FormFiller from './FormFiller';

import { IAltinnWindow } from '../../../types';

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

    FormFileUploadActions.fetchAttachments();

  }, []);
  return (
    <FormFiller />
  );
};
