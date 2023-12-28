import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';

import { Button } from '@digdir/design-system-react';
import Grid from '@material-ui/core/Grid';

import { Form, FormFirstPage } from 'src/components/form/Form';
import { PresentationComponent } from 'src/components/presentation/Presentation';
import classes from 'src/components/wrappers/ProcessWrapper.module.css';
import { LayoutValidationProvider } from 'src/features/devtools/layoutValidation/useLayoutValidation';
import { FormProvider } from 'src/features/form/FormContext';
import { FormDataForInfoTaskProvider } from 'src/features/formData/FormDataReadOnly';
import { useLaxProcessData, useTaskType } from 'src/features/instance/ProcessContext';
import { ProcessNavigationProvider } from 'src/features/instance/ProcessNavigationContext';
import { Lang } from 'src/features/language/Lang';
import { PDFWrapper } from 'src/features/pdf/PDFWrapper';
import { Confirm } from 'src/features/processEnd/confirm/containers/Confirm';
import { Feedback } from 'src/features/processEnd/feedback/Feedback';
import { ReceiptContainer } from 'src/features/receipt/ReceiptContainer';
import { TaskKeys, useNavigatePage, useNavigationParams } from 'src/hooks/useNavigatePage';
import { ProcessTaskType } from 'src/types';

interface NavigationErrorProps {
  label: ReactNode;
}

function NavigationError({ label }: NavigationErrorProps) {
  const currentTaskId = useLaxProcessData()?.currentTask?.elementId;
  const { navigateToTask } = useNavigatePage();
  return (
    <Grid
      item={true}
      xs={12}
      aria-live='polite'
      className={classes.errorReport}
    >
      <div>{label}</div>
      <div className={classes.navigationError}>
        <Button
          variant='secondary'
          onClick={() => {
            navigateToTask(currentTaskId);
          }}
        >
          <Lang id='general.navigate_to_current_process' />
        </Button>
      </div>
    </Grid>
  );
}

export function NotCurrentTaskPage() {
  return <NavigationError label={<Lang id='general.part_of_form_completed' />} />;
}

export function InvalidTaskIdPage() {
  return <NavigationError label={<Lang id='general.invalid_task_id' />} />;
}

export function ProcessWrapperWrapper() {
  const { taskId, startUrl, queryKeys } = useNavigatePage();
  const currentTaskId = useLaxProcessData()?.currentTask?.elementId;

  if (taskId === undefined && currentTaskId !== undefined) {
    return (
      <Navigate
        to={`${startUrl}/${currentTaskId}${queryKeys}`}
        replace
      />
    );
  }

  return (
    <Routes>
      <Route
        path=':taskId/*'
        element={<ProcessWrapper />}
      />
    </Routes>
  );
}

export const ProcessWrapper = () => {
  const { isCurrentTask, isValidTaskId } = useNavigatePage();
  const { taskId } = useNavigationParams();
  const taskType = useTaskType(taskId);

  if (!isValidTaskId(taskId)) {
    return (
      <PresentationComponent type={taskType}>
        <InvalidTaskIdPage />
      </PresentationComponent>
    );
  }

  if (!isCurrentTask && taskId !== TaskKeys.ProcessEnd) {
    return (
      <PresentationComponent type={taskType}>
        <NotCurrentTaskPage />
      </PresentationComponent>
    );
  }

  if (taskType === ProcessTaskType.Confirm) {
    return (
      <FormDataForInfoTaskProvider taskId={taskId}>
        <ProcessNavigationProvider>
          <PresentationComponent type={taskType}>
            <Confirm />
          </PresentationComponent>
        </ProcessNavigationProvider>
      </FormDataForInfoTaskProvider>
    );
  }

  if (taskType === ProcessTaskType.Feedback) {
    return (
      <FormDataForInfoTaskProvider taskId={taskId}>
        <PresentationComponent type={taskType}>
          <Feedback />
        </PresentationComponent>
      </FormDataForInfoTaskProvider>
    );
  }

  if (taskType === ProcessTaskType.Archived) {
    return (
      <PresentationComponent type={taskType}>
        <ReceiptContainer />
      </PresentationComponent>
    );
  }

  if (taskType === 'data') {
    return (
      <FormProvider>
        <LayoutValidationProvider>
          <Routes>
            <Route
              path=':pageKey'
              element={
                <PDFWrapper>
                  <PresentationComponent type={taskType}>
                    <Form />
                  </PresentationComponent>
                </PDFWrapper>
              }
            />
            <Route
              path='*'
              element={<FormFirstPage />}
            />
          </Routes>
        </LayoutValidationProvider>
      </FormProvider>
    );
  }

  throw new Error(`Unknown task type: ${taskType}`);
};
