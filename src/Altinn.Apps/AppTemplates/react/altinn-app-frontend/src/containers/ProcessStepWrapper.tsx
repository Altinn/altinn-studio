/* eslint-disable react/prop-types */
import * as React from 'react';
import { useSelector } from 'react-redux';
import { AltinnContentLoader, AltinnContentIconFormData } from 'altinn-shared/components';
import { getLanguageFromKey, getUserLanguage } from 'altinn-shared/utils';
import InstanceDataActions from '../resources/instanceData/instanceDataActions';
import ProcessDispatcher from '../resources/process/processDispatcher';
import { IRuntimeState, ProcessSteps, IAltinnWindow } from '../types';
import ProcessStep from './ProcessStep';
import ReceiptContainer from '../features/receipt/containers/receiptContainer';
import UnknownError from '../features/instantiate/containers/UnknownError';
import QueueActions from '../resources/queue/queueActions';
import { makeGetHasErrorsSelector } from '../selectors/getErrors';
import CustomView from '../features/custom/CustomView';

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

  const instantiating = useSelector((state: IRuntimeState) => state.instantiation.instantiating);
  const instanceId = useSelector((state: IRuntimeState) => state.instantiation.instanceId);
  const applicationMetadata: any = useSelector((state: IRuntimeState) => state.applicationMetadata.applicationMetadata);
  const isLoading: boolean = useSelector((state: IRuntimeState) => state.isLoading.dataTask);
  const textResources: any[] = useSelector((state: IRuntimeState) => state.language.language);
  const processStep: ProcessSteps = useSelector((state: IRuntimeState) => state.process.state);
  const hasErrorSelector = makeGetHasErrorsSelector();
  const hasApiErrors = useSelector(hasErrorSelector);

  (window as Window as IAltinnWindow).instanceId = `${partyId}/${instanceGuid}`;

  React.useEffect(() => {
    setUserLanguage(getUserLanguage());
  }, []);

  React.useEffect(() => {
    if (!processStep) {
      ProcessDispatcher.getProcessState();
    }

    switch (processStep) {
      case (ProcessSteps.Data): {
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
            {processStep === ProcessSteps.Archived &&
              <div id='ReceiptContainer'>
                <ReceiptContainer/>
              </div>
            }
            {processStep !== ProcessSteps.Archived &&
              <div id='custom-view'>
                <CustomView />
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
