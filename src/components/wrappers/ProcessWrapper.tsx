import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';

import { Button } from '@digdir/designsystemet-react';
import Grid from '@material-ui/core/Grid';

import { Form, FormFirstPage } from 'src/components/form/Form';
import { PresentationComponent } from 'src/components/presentation/Presentation';
import classes from 'src/components/wrappers/ProcessWrapper.module.css';
import { useCurrentDataModelGuid } from 'src/features/datamodel/useBindingSchema';
import { FormProvider } from 'src/features/form/FormContext';
import { useLayoutSets } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { useLaxProcessData, useRealTaskType, useTaskType } from 'src/features/instance/ProcessContext';
import { ProcessNavigationProvider } from 'src/features/instance/ProcessNavigationContext';
import { Lang } from 'src/features/language/Lang';
import { PDFWrapper } from 'src/features/pdf/PDFWrapper';
import { Confirm } from 'src/features/processEnd/confirm/containers/Confirm';
import { Feedback } from 'src/features/processEnd/feedback/Feedback';
import { ReceiptContainer } from 'src/features/receipt/ReceiptContainer';
import { useNavigationParam } from 'src/features/routing/AppRoutingContext';
import { TaskKeys, useIsCurrentTask, useNavigatePage, useStartUrl } from 'src/hooks/useNavigatePage';
import { ProcessTaskType } from 'src/types';
import { behavesLikeDataTask } from 'src/utils/formLayout';

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
  const taskId = useNavigationParam('taskId');
  const currentTaskId = useLaxProcessData()?.currentTask?.elementId;

  if (taskId === undefined && currentTaskId !== undefined) {
    return <NavigateToStartUrl />;
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

function NavigateToStartUrl() {
  const currentTaskId = useLaxProcessData()?.currentTask?.elementId;
  const startUrl = useStartUrl(currentTaskId);
  return (
    <Navigate
      to={startUrl}
      replace
    />
  );
}

export const ProcessWrapper = () => {
  const isCurrentTask = useIsCurrentTask();
  const { isValidTaskId } = useNavigatePage();
  const taskId = useNavigationParam('taskId');
  const taskType = useTaskType(taskId);
  const realTaskType = useRealTaskType();
  const layoutSets = useLayoutSets();
  const dataModelGuid = useCurrentDataModelGuid();

  const hasCustomReceipt = behavesLikeDataTask(TaskKeys.CustomReceipt, layoutSets);
  const customReceiptDataModelNotFound = hasCustomReceipt && !dataModelGuid && taskId === TaskKeys.CustomReceipt;

  if (!isValidTaskId(taskId)) {
    return (
      <PresentationComponent type={realTaskType}>
        <InvalidTaskIdPage />
      </PresentationComponent>
    );
  }

  if (!isCurrentTask && taskId !== TaskKeys.ProcessEnd) {
    return (
      <PresentationComponent type={realTaskType}>
        <NotCurrentTaskPage />
      </PresentationComponent>
    );
  }

  if (taskType === ProcessTaskType.Confirm) {
    return (
      <ProcessNavigationProvider>
        <PresentationComponent type={realTaskType}>
          <Confirm />
        </PresentationComponent>
      </ProcessNavigationProvider>
    );
  }

  if (taskType === ProcessTaskType.Feedback) {
    return (
      <PresentationComponent type={realTaskType}>
        <Feedback />
      </PresentationComponent>
    );
  }

  if (taskType === ProcessTaskType.Archived) {
    return (
      <PresentationComponent type={realTaskType}>
        <ReceiptContainer />
      </PresentationComponent>
    );
  }

  if (taskType === ProcessTaskType.Data && customReceiptDataModelNotFound) {
    window.logWarnOnce(
      'You specified a custom receipt, but the data model is missing. Falling back to default receipt.',
    );
    return (
      <PresentationComponent type={realTaskType}>
        <ReceiptContainer />
      </PresentationComponent>
    );
  }

  if (taskType === ProcessTaskType.Data) {
    return (
      <FormProvider>
        <Routes>
          <Route
            path=':pageKey'
            element={
              <PDFWrapper>
                <PresentationComponent type={realTaskType}>
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
      </FormProvider>
    );
  }

  throw new Error(`Unknown task type: ${taskType}`);
};
