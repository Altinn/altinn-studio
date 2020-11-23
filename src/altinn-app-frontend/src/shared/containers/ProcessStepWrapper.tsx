/* eslint-disable react/prop-types */
import * as React from 'react';
import { useSelector } from 'react-redux';
import { AltinnContentLoader, AltinnContentIconFormData } from 'altinn-shared/components';
import { getTextResourceByKey } from 'altinn-shared/utils';
import InstanceDataActions from '../resources/instanceData/instanceDataActions';
import ProcessDispatcher from '../resources/process/processDispatcher';
import { IRuntimeState, ProcessSteps, IAltinnWindow } from '../../types';
import ProcessStep from './ProcessStep';
// eslint-disable-next-line import/no-named-as-default
import Form from '../../features/form/containers/Form';
import ReceiptContainer from '../../features/receipt/containers/receiptContainer';
import Confirm from '../../features/confirm/containers/Confirm';
import UnknownError from '../../features/instantiate/containers/UnknownError';
import QueueActions from '../resources/queue/queueActions';
import { makeGetHasErrorsSelector } from '../../selectors/getErrors';
import Feedback from '../../features/feedback/Feedback';

export default (props) => {
  const {
    match: {
      params: {
        partyId,
        instanceGuid,
      },
    },
  } = props;
  const [userLanguage, setUserLanguage] = React.useState('nb');
  const [appHeader, setAppHeader] = React.useState('');

  const instantiating = useSelector((state: IRuntimeState) => state.instantiation.instantiating);
  const instanceId = useSelector((state: IRuntimeState) => state.instantiation.instanceId);
  const applicationMetadata: any = useSelector((state: IRuntimeState) => state.applicationMetadata.applicationMetadata);
  const isLoading: boolean = useSelector((state: IRuntimeState) => state.isLoading.dataTask);
  const textResources: any[] = useSelector((state: IRuntimeState) => state.textResources.resources);
  const processStep: ProcessSteps = useSelector((state: IRuntimeState) => state.process.state);
  const hasErrorSelector = makeGetHasErrorsSelector();
  const hasApiErrors = useSelector(hasErrorSelector);
  const profile = useSelector((state: IRuntimeState) => state.profile.profile);

  (window as Window as IAltinnWindow).instanceId = `${partyId}/${instanceGuid}`;

  React.useEffect(() => {
    if (profile && profile.profileSettingPreference) {
      setUserLanguage(profile.profileSettingPreference.language);
    }
  }, [profile]);

  React.useEffect(() => {
    const getHeaderText = () => {
      const appNameKey = 'ServiceName';
      let appName;
      if (textResources) {
        appName = getTextResourceByKey(appNameKey, textResources);
      }

      if (appName && appName === appNameKey) {
        if (applicationMetadata) {
          return applicationMetadata.title[userLanguage] || applicationMetadata.title.nb;
        }
      }
      return appName;
    };
    setAppHeader(getHeaderText());
  }, [textResources, applicationMetadata]);

  React.useEffect(() => {
    if (!processStep) {
      ProcessDispatcher.getProcessState();
    }

    switch (processStep) {
      case (ProcessSteps.FormFilling): {
        QueueActions.startInitialDataTaskQueue();
        break;
      }
      case (ProcessSteps.Confirm):
      case (ProcessSteps.Feedback):
      case (ProcessSteps.Archived): {
        QueueActions.startInitialDataTaskQueue();
        break;
      }
      default:
        break;
    }
  }, [processStep]);

  React.useEffect(() => {
    if (!instantiating && !instanceId) {
      InstanceDataActions.getInstanceData(partyId, instanceGuid);
    }
  }, [instantiating, instanceId]);

  if (hasApiErrors) {
    return <UnknownError />;
  }

  if (!processStep) {
    return null;
  }

  return (
    <ProcessStep
      header={appHeader}
      step={processStep}
    >
      <div>
        {isLoading === false ? (
          <>
            {processStep === ProcessSteps.FormFilling &&
              <Form />
            }
            {processStep === ProcessSteps.Archived &&
              <div id='ReceiptContainer'>
                <ReceiptContainer/>
              </div>
            }
            {processStep === ProcessSteps.Confirm &&
              <div id='ConfirmContainer'>
                <Confirm />
              </div>
            }
            {processStep === ProcessSteps.Feedback &&
              <div id='FeedbackContainer'>
                <Feedback />
              </div>
            }
          </>
        ) : (
          <div style={{ marginTop: '2.5rem' }}>
            <AltinnContentLoader width={680} height={700}>
              <AltinnContentIconFormData/>
            </AltinnContentLoader>
          </div>
        )}
      </div>
    </ProcessStep>
  );
};
