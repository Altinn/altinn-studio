import React from 'react';
import { useSearchParams } from 'react-router-dom';

import cn from 'classnames';
import type { AxiosError } from 'axios';

import { AltinnContentIconFormData } from 'src/components/atoms/AltinnContentIconFormData';
import { Form } from 'src/components/form/Form';
import { AltinnContentLoader } from 'src/components/molecules/AltinnContentLoader';
import { PresentationComponent } from 'src/components/wrappers/Presentation';
import classes from 'src/components/wrappers/ProcessWrapper.module.css';
import { Confirm } from 'src/features/confirm/containers/Confirm';
import { Feedback } from 'src/features/feedback/Feedback';
import { InstanceDataActions } from 'src/features/instanceData/instanceDataSlice';
import { ForbiddenError } from 'src/features/instantiate/containers/ForbiddenError';
import { UnknownError } from 'src/features/instantiate/containers/UnknownError';
import { PDFView } from 'src/features/pdf/PDFView';
import { ReceiptContainer } from 'src/features/receipt/ReceiptContainer';
import { useApiErrorCheck } from 'src/hooks/useApiErrorCheck';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { useInstanceIdParams } from 'src/hooks/useInstanceIdParams';
import { useProcess } from 'src/hooks/useProcess';
import { ProcessTaskType } from 'src/types';
import { behavesLikeDataTask } from 'src/utils/formLayout';
import { checkIfAxiosError, HttpStatusCodes } from 'src/utils/network/networking';

export interface IProcessWrapperProps {
  isFetching?: boolean;
}

export const ProcessWrapper = ({ isFetching }: IProcessWrapperProps) => {
  const instantiating = useAppSelector((state) => state.instantiation.instantiating);
  const dataTaskIsLoading = useAppSelector((state) => state.isLoading.dataTask);
  const isLoading = dataTaskIsLoading !== false || isFetching === true;
  const layoutSets = useAppSelector((state) => state.formLayout.layoutsets);
  const { hasApiErrors } = useApiErrorCheck();
  const processError = useAppSelector((state) => state.process.error);
  const { dispatch, process, appOwner, appName } = useProcess();

  const instanceId = useAppSelector((state) => state.instantiation.instanceId);
  const instanceIdFromUrl = useInstanceIdParams()?.instanceId;
  window.instanceId = instanceIdFromUrl;

  const [searchParams] = useSearchParams();
  const renderPDF = searchParams.get('pdf') === '1';
  const previewPDF = useAppSelector((state) => state.devTools.pdfPreview);

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
    if (checkIfAxiosError(processError)) {
      const axiosError = processError as AxiosError;
      if (axiosError.status === HttpStatusCodes.Forbidden) {
        return <ForbiddenError />;
      }
    }
    return <UnknownError />;
  }

  if (!process?.taskType) {
    return null;
  }
  const { taskType } = process;

  if (renderPDF) {
    if (isLoading) {
      return null;
    }
    return (
      <PDFView
        appName={appName as string}
        appOwner={appOwner}
      />
    );
  }

  return (
    <>
      <div
        className={cn(classes['content'], {
          [classes['hide-form']]: previewPDF,
        })}
      >
        <PresentationComponent
          header={appName}
          appOwner={appOwner}
          type={taskType}
        >
          {!isLoading ? (
            <>
              {taskType === ProcessTaskType.Data || behavesLikeDataTask(process.taskId, layoutSets) ? (
                <Form />
              ) : taskType === ProcessTaskType.Confirm ? (
                <Confirm />
              ) : taskType === ProcessTaskType.Feedback ? (
                <Feedback />
              ) : taskType === ProcessTaskType.Archived ? (
                <ReceiptContainer />
              ) : null}
            </>
          ) : (
            <div style={{ marginTop: '1.5625rem' }}>
              <AltinnContentLoader
                width='100%'
                height={700}
              >
                <AltinnContentIconFormData />
              </AltinnContentLoader>
            </div>
          )}
        </PresentationComponent>
      </div>
      {previewPDF && !isLoading && (
        <div className={cn(classes['content'], classes['hide-pdf'])}>
          <PDFView
            appName={appName as string}
            appOwner={appOwner}
          />
        </div>
      )}
    </>
  );
};
