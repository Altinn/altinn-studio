import * as React from 'react';
import FormFiller from './containers/FormFiller';
import FormDataActions from './features/form/data/actions';
import FormDataModelActions from './features/form/datamodell/actions';
import FormDynamicActions from './features/form/dynamics/actions';
import FormLayoutActions from './features/form/layout/actions';
import FormResourceActions from './features/form/resources/actions';
import FormWorkflowActions from './features/form/workflow/actions';
import LanguageActions from './features/languages/actions';

import { IAltinnWindow } from './types';

export interface IAppProps { }
export interface IAppState { }

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
    // TODO: This link should point to
    // tslint:disable-next-line:max-line-length
    // `${altinnWindow.location.origin}/runtime/api/workflow/${reportee}/${servicePath}/GetCurrentState?instanceId=${instanceId}`);
    // WHEN WE MERGE WITH MASTER
    FormWorkflowActions.getCurrentState(
      `${window.location.origin}/runtime/${org}/${service}/${instanceId}/GetCurrentState?reporteeId=${reportee}`,
    );
    FormDynamicActions.fetchFormDynamics(
      `${window.location.origin}/runtime/api/resource/${org}/${service}/ServiceConfigurations.json`,
    );
    FormResourceActions.fetchFormResource(
      `${window.location.origin}/runtime/api/textresources/${org}/${service}`,
    );
  }, []);
  return (
    <FormFiller />
  );
};
