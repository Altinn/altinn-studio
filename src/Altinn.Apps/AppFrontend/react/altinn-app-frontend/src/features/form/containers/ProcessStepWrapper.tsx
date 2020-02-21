import * as React from 'react';
import { useSelector } from 'react-redux';
import { AltinnContentLoader, AltinnContentIconFormData } from 'altinn-shared/components'
import { getLanguageFromKey, getUserLanguage } from 'altinn-shared/utils';
import InstanceDataActions from '../../../shared/resources/instanceData/instanceDataActions';
import ProcessDispatcher from '../../../shared/resources/process/processDispatcher';
import QueueActions from '../../../shared/resources/queue/queueActions';
import { IRuntimeState, ProcessSteps, IAltinnWindow } from '../../../types';
import ProcessStep from './ProcessStep';
import Render from './Form';
import UnknownError from '../../instantiate/containers/UnknownError';

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
  const queue: any = useSelector((state: IRuntimeState) => state.queue);

  (window as Window as IAltinnWindow).instanceId = partyId + '/' + instanceGuid;

  React.useEffect(() => {
    setUserLanguage(getUserLanguage());
    ProcessDispatcher.getProcessState();
    QueueActions.startInitialDataTaskQueue();
  }, []);

  React.useEffect(() => {
    if (!instantiation.instantiating && !instantiation.instanceId) {
      InstanceDataActions.getInstanceData(partyId, instanceGuid);
    }
  }, [instantiation]);

  if (queue.dataTask.error || queue.appTask.error) {
    return <UnknownError />
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
          <Render />
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
