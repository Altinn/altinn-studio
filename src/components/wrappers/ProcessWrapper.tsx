import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Route, Routes, useLocation } from 'react-router-dom';

import { Button } from '@digdir/designsystemet-react';
import Grid from '@material-ui/core/Grid';

import { Form, FormFirstPage } from 'src/components/form/Form';
import { PresentationComponent } from 'src/components/presentation/Presentation';
import classes from 'src/components/wrappers/ProcessWrapper.module.css';
import { Loader } from 'src/core/loading/Loader';
import { useAppName, useAppOwner } from 'src/core/texts/appTexts';
import { useCurrentDataModelGuid } from 'src/features/datamodel/useBindingSchema';
import { FormProvider } from 'src/features/form/FormContext';
import { useLayoutSets } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { useGetTaskType, useLaxProcessData, useRealTaskType } from 'src/features/instance/ProcessContext';
import { ProcessNavigationProvider } from 'src/features/instance/ProcessNavigationContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { PDFWrapper } from 'src/features/pdf/PDFWrapper';
import { Confirm } from 'src/features/processEnd/confirm/containers/Confirm';
import { Feedback } from 'src/features/processEnd/feedback/Feedback';
import { ReceiptContainer } from 'src/features/receipt/ReceiptContainer';
import { useNavigate, useNavigationParam, useQueryKeysAsString } from 'src/features/routing/AppRoutingContext';
import { TaskKeys, useIsCurrentTask, useNavigatePage, useStartUrl } from 'src/hooks/useNavigatePage';
import { implementsSubRouting } from 'src/layout';
import { RedirectBackToMainForm } from 'src/layout/Subform/SubformWrapper';
import { ProcessTaskType } from 'src/types';
import { behavesLikeDataTask } from 'src/utils/formLayout';
import { getPageTitle } from 'src/utils/getPageTitle';
import { useNode } from 'src/utils/layout/NodesContext';

interface NavigationErrorProps {
  label: string;
}

function NavigationError({ label }: NavigationErrorProps) {
  const currentTaskId = useLaxProcessData()?.currentTask?.elementId;
  const { navigateToTask } = useNavigatePage();

  const appName = useAppName();
  const appOwner = useAppOwner();
  const { langAsString } = useLanguage();

  return (
    <>
      <Helmet>
        <title>{`${getPageTitle(appName, langAsString(label), appOwner)}`}</title>
      </Helmet>
      <Grid
        item={true}
        xs={12}
        aria-live='polite'
      >
        <div>
          <Lang id={label} />
        </div>

        {currentTaskId && (
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
        )}
      </Grid>
    </>
  );
}

export function NotCurrentTaskPage() {
  return <NavigationError label={'general.part_of_form_completed'} />;
}

export function InvalidTaskIdPage() {
  return <NavigationError label={'general.invalid_task_id'} />;
}

export function NavigateToStartUrl() {
  const navigate = useNavigate();
  const currentTaskId = useLaxProcessData()?.currentTask?.elementId;
  const startUrl = useStartUrl(currentTaskId);

  const currentLocation = `${useLocation().pathname}${useQueryKeysAsString()}`;

  useEffect(() => {
    if (currentLocation !== startUrl) {
      navigate(startUrl, { replace: true });
    }
  }, [currentLocation, navigate, startUrl]);

  return <Loader reason='navigate-to-process-start' />;
}

export const ProcessWrapper = () => {
  const isCurrentTask = useIsCurrentTask();
  const { isValidTaskId } = useNavigatePage();
  const taskId = useNavigationParam('taskId');
  const taskType = useGetTaskType()(taskId);
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
            path=':pageKey/:componentId/*'
            element={
              <PresentationComponent type={realTaskType}>
                <ComponentRouting />
              </PresentationComponent>
            }
          />
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

export const ComponentRouting = () => {
  const componentId = useNavigationParam('componentId');
  const node = useNode(componentId);

  // Wait for props to sync, needed for now
  if (!componentId) {
    return <Loader reason='component-routing' />;
  }

  if (!node) {
    // Consider adding a 404 page?
    return <RedirectBackToMainForm />;
  }

  if (implementsSubRouting(node.def)) {
    const SubRouting = node?.def.subRouting;
    return (
      <SubRouting
        key={node.id}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        node={node as any}
      />
    );
  }

  // If node exists but does not implement sub routing
  throw new Error(`Component ${componentId} does not have subRouting`);
};
