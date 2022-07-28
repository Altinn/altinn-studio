import React from 'react';
import { useParams } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from 'src/common/hooks';
import Confirm from 'src/features/confirm/containers/Confirm';
import Feedback from 'src/features/feedback/Feedback';
import { Form } from 'src/features/form/containers/Form';
import UnknownError from 'src/features/instantiate/containers/UnknownError';
import ReceiptContainer from 'src/features/receipt/containers/ReceiptContainer';
import { makeGetHasErrorsSelector } from 'src/selectors/getErrors';
import { selectAppName, selectAppOwner } from 'src/selectors/language';
import Presentation from 'src/shared/containers/Presentation';
import { InstanceDataActions } from 'src/shared/resources/instanceData/instanceDataSlice';
import { IsLoadingActions } from 'src/shared/resources/isLoading/isLoadingSlice';
import { ProcessActions } from 'src/shared/resources/process/processSlice';
import { QueueActions } from 'src/shared/resources/queue/queueSlice';
import { ProcessTaskType } from 'src/types';
import type { IAltinnWindow, IPartyIdInterfaceGuidParams } from 'src/types';

import {
  AltinnContentIconFormData,
  AltinnContentLoader,
} from 'altinn-shared/components';

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
        dispatch(QueueActions.startInitialDataTaskQueue());
        break;
      }
      case ProcessTaskType.Confirm:
      case ProcessTaskType.Feedback:
        dispatch(QueueActions.startInitialInfoTaskQueue());
        break;
      case ProcessTaskType.Archived: {
        dispatch(IsLoadingActions.finishDataTaskIsLoading());
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
      <>
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
      </>
    </Presentation>
  );
};

export default ProcessWrapper;
