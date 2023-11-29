import React from 'react';
import { useSearchParams } from 'react-router-dom';

import cn from 'classnames';

import { Form } from 'src/components/form/Form';
import { PresentationComponent } from 'src/components/presentation/Presentation';
import classes from 'src/components/wrappers/ProcessWrapper.module.css';
import { Confirm } from 'src/features/confirm/containers/Confirm';
import { Feedback } from 'src/features/feedback/Feedback';
import { useRealTaskType } from 'src/features/instance/ProcessContext';
import { PDFView } from 'src/features/pdf/PDFView';
import { ReceiptContainer } from 'src/features/receipt/ReceiptContainer';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { ProcessTaskType } from 'src/types';

export const ProcessWrapper = () => {
  const taskType = useRealTaskType();

  const [searchParams] = useSearchParams();
  const renderPDF = searchParams.get('pdf') === '1';
  const previewPDF = useAppSelector((state) => state.devTools.pdfPreview);

  if (renderPDF) {
    return <PDFView />;
  }

  return (
    <>
      <div
        className={cn(classes['content'], {
          [classes['hide-form']]: previewPDF,
        })}
      >
        <PresentationComponent type={taskType}>
          {taskType === ProcessTaskType.Data ? (
            <Form />
          ) : taskType === ProcessTaskType.Confirm ? (
            <Confirm />
          ) : taskType === ProcessTaskType.Feedback ? (
            <Feedback />
          ) : taskType === ProcessTaskType.Archived ? (
            <ReceiptContainer />
          ) : null}
        </PresentationComponent>
      </div>
      {previewPDF && (
        <div className={cn(classes['content'], classes['hide-pdf'])}>
          <PDFView />
        </div>
      )}
    </>
  );
};
