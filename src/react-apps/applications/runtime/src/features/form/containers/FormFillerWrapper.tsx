import * as React from 'react';
import InstanceDataActions from '../../../shared/resources/instanceData/instanceDataActions';
import ProcessDispatcher from '../../../shared/resources/process/processDispatcher';
import QueueActions from '../../../shared/resources/queue/queueActions';
import { IAltinnWindow } from '../../../types';
import FormFiller from './FormFiller';

export default (props) => {
  const {
    match: {
      params: {
        partyId,
        instanceGuid,
      },
    },
  } = props;

  (window as Window as IAltinnWindow).instanceId = partyId + '/' + instanceGuid;

  React.useEffect(() => {
    ProcessDispatcher.getProcessState();
    InstanceDataActions.getInstanceData(partyId, instanceGuid);
    QueueActions.startInitialDataTaskQueue();
  }, []);

  return (
    <FormFiller />
  );
};
