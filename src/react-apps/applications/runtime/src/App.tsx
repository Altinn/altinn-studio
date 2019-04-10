import * as React from 'react';
import { FormFiller } from './containers/FormFiller';
import FormDataActions from './features/form/data/actions';
import FormDataModelActions from './features/form/datamodell/actions';
import FormLayoutActions from './features/form/layout/actions';
import FormWorkflowActions from './features/form/workflow/actions';
import LanguageActions from './features/languages/actions';

export interface IAppProps { }
export interface IAppState { }

interface IAltinnWindow extends Window {
  org: string;
  service: string;
  instanceId: string;
  reportee: string;
}

export default () => {
  React.useEffect(() => {
    const { org, service, instanceId, reportee } = window as IAltinnWindow;
    FormDataModelActions.fetchDataModel(
      `${window.location.origin}/runtime/api/metadata/${org}/${service}/ServiceMetaData`,
    );
    FormLayoutActions.fetchFormLayout(
      `${window.location.origin}/runtime/api/resource/${org}/${service}/FormLayout.json`,
    );
    FormDataActions.fetchFormData(
      `${window.location.origin}/runtime/api/${reportee}/${org}/${service}/Index/${instanceId}`,
    );
    FormWorkflowActions.getCurrentState(
      `${window.location.origin}/runtime/${org}/${service}/${instanceId}/GetCurrentState?reporteeId=${reportee}`,
    );
    LanguageActions.fetchLanguage(
      `${window.location.origin}/runtime/api/Language/GetLanguageAsJSON`, 'nb');
  }, []);
  return (
    <FormFiller />
  );
};
