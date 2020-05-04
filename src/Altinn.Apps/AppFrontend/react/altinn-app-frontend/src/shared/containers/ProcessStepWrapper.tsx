import * as React from 'react';
import { useSelector } from 'react-redux';
import { AltinnContentLoader, AltinnContentIconFormData } from 'altinn-shared/components'
import { getLanguageFromKey, getUserLanguage } from 'altinn-shared/utils';
import InstanceDataActions from '../resources/instanceData/instanceDataActions';
import ProcessDispatcher from '../resources/process/processDispatcher';
import { IRuntimeState, ProcessSteps, IAltinnWindow } from '../../types';
import ProcessStep from './ProcessStep';
import Form from '../../features/form/containers/Form';
import ReceiptContainer from '../../features/receipt/containers/receiptContainer';
import Confirm from '../../features/confirm/containers/Confirm';
import UnknownError from '../../features/instantiate/containers/UnknownError';
import QueueActions from '../resources/queue/queueActions';
import IsLoadingActions from '../resources/isLoading/isLoadingActions';
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

  const instantiation = useSelector((state: IRuntimeState) => state.instantiation);
  const applicationMetadata: any = useSelector((state: IRuntimeState) => state.applicationMetadata.applicationMetadata);
  const isLoading: boolean = useSelector((state: IRuntimeState) => state.isLoading.dataTask);
  const textResources: any[] = useSelector((state: IRuntimeState) => state.language.language);
  const processStep: ProcessSteps = useSelector((state: IRuntimeState) => state.process.state);
  const hasErrorSelector = makeGetHasErrorsSelector();
  const hasApiErrors = useSelector(hasErrorSelector);

  (window as Window as IAltinnWindow).instanceId = partyId + '/' + instanceGuid;

  React.useEffect(() => {
    setUserLanguage(getUserLanguage());
  }, []);

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
        IsLoadingActions.finishDataTaskIsloading();
        break;
      }
      default:
        break;
    }
  }, [processStep])

  React.useEffect(() => {
    if (!instantiation.instantiating && !instantiation.instanceId) {
      InstanceDataActions.getInstanceData(partyId, instanceGuid);
    }
  }, [instantiation]);

  if (hasApiErrors) {
    return <UnknownError />
  }

  if (!processStep) {
    return null;
  }

  return (
    <ProcessStep
      header={
        applicationMetadata &&
          applicationMetadata.title[userLanguage] ? applicationMetadata.title[userLanguage] :
          getLanguageFromKey('general.ServiceName', textResources)
      }
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
            <div id="FeedbackContainer">
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
