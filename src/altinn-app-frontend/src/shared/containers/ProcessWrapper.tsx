import React from 'react';
import { useParams } from 'react-router-dom';
import {
  AltinnContentLoader,
  AltinnContentIconFormData,
} from 'altinn-shared/components';
import type { IAltinnWindow, IPartyIdInterfaceGuidParams } from '../../types';
import { ProcessTaskType } from '../../types';
import Presentation from './Presentation';
import { Form } from '../../features/form/containers/Form';
import ReceiptContainer from '../../features/receipt/containers/ReceiptContainer';
import Confirm from '../../features/confirm/containers/Confirm';
import UnknownError from '../../features/instantiate/containers/UnknownError';
import {
  startInitialDataTaskQueue,
  startInitialInfoTaskQueue,
} from '../resources/queue/queueSlice';
import { makeGetHasErrorsSelector } from '../../selectors/getErrors';
import Feedback from '../../features/feedback/Feedback';
import { finishDataTaskIsLoading } from '../resources/isLoading/isLoadingSlice';
import { useAppDispatch, useAppSelector } from 'src/common/hooks';
import { selectAppName, selectAppOwner } from 'src/selectors/language';
import { InstanceDataActions } from 'src/shared/resources/instanceData/instanceDataSlice';
import { ProcessActions } from 'src/shared/resources/process/processSlice';

const style = {
  marginTop: '2.5rem',
};

const ProcessWrapper = () => {
  const { partyId, instanceGuid }: IPartyIdInterfaceGuidParams = useParams();

  const dispatch = useAppDispatch();

  const instantiating = useAppSelector(
    (state) => state.instantiation.instantiating,
  );
  const instanceId = useAppSelector((state) => state.instantiation.instanceId);
  const instanceData = useAppSelector((state) => state.instanceData.instance);
  const applicationMetadata = useAppSelector(
    (state) => state.applicationMetadata.applicationMetadata,
  );
  const isLoading = useAppSelector((state) => state.isLoading.dataTask);
  const appName = useAppSelector(selectAppName);
  const appOwner = useAppSelector(selectAppOwner);
  const process = useAppSelector((state) => state.process);
  const hasErrorSelector = makeGetHasErrorsSelector();
  const hasApiErrors = useAppSelector(hasErrorSelector);

  (window as Window as IAltinnWindow).instanceId = `${partyId}/${instanceGuid}`;

  React.useEffect(() => {
    if (!applicationMetadata || !instanceData) {
      return;
    }

    if (!process || !process.taskType) {
      dispatch(ProcessActions.get());
    }

    switch (process.taskType) {
      case ProcessTaskType.Data: {
        dispatch(startInitialDataTaskQueue());
        break;
      }
      case ProcessTaskType.Confirm:
      case ProcessTaskType.Feedback:
        dispatch(startInitialInfoTaskQueue());
        break;
      case ProcessTaskType.Archived: {
        dispatch(finishDataTaskIsLoading());
        break;
      }
      default:
        break;
    }
  }, [process, applicationMetadata, instanceData, dispatch]);

  React.useEffect(() => {
    if (!instantiating && !instanceId) {
      dispatch(
        InstanceDataActions.get({
          instanceOwner: partyId,
          instanceId: instanceGuid,
        }),
      );
    }
  }, [instantiating, instanceId, instanceGuid, partyId, dispatch]);

  if (hasApiErrors) {
    return <UnknownError />;
  }

  if (!process || !process.taskType) {
    return null;
  }

  return (
    <Presentation
      header={appName}
      appOwner={appOwner}
      type={process.taskType}
    >
      <div>
        {isLoading === false ? (
          <>
            {process.taskType === ProcessTaskType.Data && <Form />}
            {process.taskType === ProcessTaskType.Archived && (
              <div id='ReceiptContainer'>
                <ReceiptContainer />
              </div>
            )}
            {process.taskType === ProcessTaskType.Confirm && (
              <div id='ConfirmContainer'>
                <Confirm />
              </div>
            )}
            {process.taskType === ProcessTaskType.Feedback && (
              <div id='FeedbackContainer'>
                <Feedback />
              </div>
            )}
          </>
        ) : (
          <div style={style}>
            <AltinnContentLoader
              width='100%'
              height={700}
            >
              <AltinnContentIconFormData />
            </AltinnContentLoader>
          </div>
        )}
      </div>
    </Presentation>
  );
};

export default ProcessWrapper;
