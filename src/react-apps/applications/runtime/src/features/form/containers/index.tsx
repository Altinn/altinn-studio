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

  let routePrefix: string = null;

  // If running in altinn.studio or locally at altinn3.no, add /runtime before each API-call
  if (window.location.origin.includes('altinn.studio') || window.location.origin.includes('altinn3.no')) {
    routePrefix = `/runtime`;
  }

  (window as IAltinnWindow).instanceId = instanceId;

  React.useEffect(() => {
    const { org, service, reportee } = window as IAltinnWindow;
    LanguageActions.fetchLanguage(
      `${window.location.origin}${routePrefix}/api/Language/GetLanguageAsJSON`,
      'nb',
    );
    FormDataModelActions.fetchDataModel(
      `${window.location.origin}${routePrefix}/api/metadata/${org}/${service}/ServiceMetaData`,
    );
    FormLayoutActions.fetchFormLayout(
      `${window.location.origin}${routePrefix}/api/resource/${org}/${service}/FormLayout.json`,
    );
    FormDataActions.fetchFormData(
      `${window.location.origin}${routePrefix}/api/${reportee}/${org}/${service}/Index/${instanceId}`,
    );
    FormRuleActions.fetchRuleModel(
      `${window.location.origin}${routePrefix}/api/resource/${org}/${service}/RuleHandler.js`,
    );
    FormWorkflowActions.getCurrentState(
      // tslint:disable-next-line:max-line-length
      `${window.location.origin}${routePrefix}/api/workflow/${reportee}/${org}/${service}/GetCurrentState?instanceId=${instanceId}`,
    );

    FormDynamicActions.fetchFormDynamics(
      `${window.location.origin}${routePrefix}/api/resource/${org}/${service}/ServiceConfigurations.json`,
    );
    FormResourceActions.fetchFormResource(
      `${window.location.origin}${routePrefix}/api/textresources/${org}/${service}`,
    );

    ProfileActions.fetchProfile(
      `${window.location.origin}/runtime/api/v1/profile/user`,
    );

    AttachmentActions.fetchAttachments();

  }, []);
  return (
    <FormFiller />
  );
};
