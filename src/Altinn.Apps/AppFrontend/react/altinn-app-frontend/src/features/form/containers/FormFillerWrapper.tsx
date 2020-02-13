import * as React from 'react';
import InstanceDataActions from '../../../shared/resources/instanceData/instanceDataActions';
import ProcessDispatcher from '../../../shared/resources/process/processDispatcher';
import QueueActions from '../../../shared/resources/queue/queueActions';
import { IAltinnWindow, IRuntimeState } from '../../../types';
import FormFiller from './FormFiller';
import { useSelector } from 'react-redux';

export default (props) => {
  const {
    match: {
      params: {
        partyId,
        instanceGuid,
      },
    },
  } = props;

  const instantiation = useSelector((state: IRuntimeState) => state.instantiation);

  (window as Window as IAltinnWindow).instanceId = partyId + '/' + instanceGuid;

  React.useEffect(() => {
    ProcessDispatcher.getProcessState();
    QueueActions.startInitialDataTaskQueue();
  }, []);

  React.useEffect(() => {
    if (!instantiation.instantiating && !instantiation.instanceId) {
      InstanceDataActions.getInstanceData(partyId, instanceGuid);
    }
  }, [instantiation]);

  return (
    <FormFiller />
  );
};
