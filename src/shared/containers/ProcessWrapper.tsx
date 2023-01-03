import React from 'react';
import { useSearchParams } from 'react-router-dom';

import { useAppSelector, useInstanceIdParams, useProcess } from 'src/common/hooks';
import { useApiErrorCheck } from 'src/common/hooks/useApiErrorCheck';
import { AltinnContentIconFormData, AltinnContentLoader } from 'src/components/shared';
import { Confirm } from 'src/features/confirm/containers/Confirm';
import Feedback from 'src/features/feedback/Feedback';
import { Form } from 'src/features/form/containers/Form';
import UnknownError from 'src/features/instantiate/containers/UnknownError';
import PDFView from 'src/features/pdf/PDFView';
import Receipt from 'src/features/receipt/containers/ReceiptContainer';
import Presentation from 'src/shared/containers/Presentation';
import { InstanceDataActions } from 'src/shared/resources/instanceData/instanceDataSlice';
import { ProcessTaskType } from 'src/types';
import { behavesLikeDataTask } from 'src/utils/formLayout';

const ProcessWrapper = () => {
  const instantiating = useAppSelector((state) => state.instantiation.instantiating);
  const isLoading = useAppSelector((state) => state.isLoading.dataTask);
  const layoutSets = useAppSelector((state) => state.formLayout.layoutsets);
  const { hasApiErrors } = useApiErrorCheck();
  const { dispatch, process, appOwner, appName } = useProcess();

  const instanceId = useAppSelector((state) => state.instantiation.instanceId);
  const instanceIdFromUrl = useInstanceIdParams()?.instanceId;
  window['instanceId'] = instanceIdFromUrl;

  const [searchParams] = useSearchParams();
  const pdf = searchParams.get('pdf') === '1';

  React.useEffect(() => {
    if (!instantiating && !instanceId) {
      dispatch(
        InstanceDataActions.get({
          instanceId: instanceIdFromUrl,
        }),
      );
    }
  }, [instantiating, instanceId, dispatch, instanceIdFromUrl]);
  if (hasApiErrors) {
    return <UnknownError />;
  }

  if (!process?.taskType) {
    return null;
  }
  const { taskType } = process;

  if (pdf) {
    return (
      <PDFView
        appName={appName as string}
        appOwner={appOwner}
      />
    );
  }

  return (
    <Presentation
      header={appName}
      appOwner={appOwner}
      type={taskType}
    >
      {isLoading === false ? (
        <>
          {taskType === ProcessTaskType.Data && <Form />}
          {taskType === ProcessTaskType.Archived && <Receipt />}
          {taskType === ProcessTaskType.Confirm &&
            (behavesLikeDataTask(process.taskId, layoutSets) ? <Form /> : <Confirm />)}
          {taskType === ProcessTaskType.Feedback && <Feedback />}
        </>
      ) : (
        <div style={{ marginTop: '2.5rem' }}>
          <AltinnContentLoader
            width='100%'
            height={700}
          >
            <AltinnContentIconFormData />
          </AltinnContentLoader>
        </div>
      )}
    </Presentation>
  );
};

export default ProcessWrapper;
