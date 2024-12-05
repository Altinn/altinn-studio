import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Route, Routes } from 'react-router-dom';

import Grid from '@material-ui/core/Grid';

import { Button } from 'src/app-components/Button/Button';
import { Form } from 'src/components/form/Form';
import { PresentationComponent } from 'src/components/presentation/Presentation';
import classes from 'src/components/wrappers/ProcessWrapper.module.css';
import { Loader } from 'src/core/loading/Loader';
import { useAppName, useAppOwner } from 'src/core/texts/appTexts';
import { FormProvider } from 'src/features/form/FormContext';
import { useGetTaskTypeById, useLaxProcessData } from 'src/features/instance/ProcessContext';
import { ProcessNavigationProvider } from 'src/features/instance/ProcessNavigationContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { PDFWrapper } from 'src/features/pdf/PDFWrapper';
import { Confirm } from 'src/features/processEnd/confirm/containers/Confirm';
import { Feedback } from 'src/features/processEnd/feedback/Feedback';
import {
  useNavigate,
  useNavigationParam,
  useNavigationPath,
  useQueryKeysAsString,
} from 'src/features/routing/AppRoutingContext';
import { useIsCurrentTask, useIsValidTaskId, useNavigateToTask, useStartUrl } from 'src/hooks/useNavigatePage';
import { RedirectBackToMainForm } from 'src/layout/Subform/SubformWrapper';
import { ProcessTaskType } from 'src/types';
import { getPageTitle } from 'src/utils/getPageTitle';
import { useNode } from 'src/utils/layout/NodesContext';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface NavigationErrorProps {
  label: string;
}

function NavigationError({ label }: NavigationErrorProps) {
  const currentTaskId = useLaxProcessData()?.currentTask?.elementId;
  const navigateToTask = useNavigateToTask();

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
              size='md'
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

export function NavigateToStartUrl() {
  const navigate = useNavigate();
  const currentTaskId = useLaxProcessData()?.currentTask?.elementId;
  const startUrl = useStartUrl(currentTaskId);

  const currentLocation = `${useNavigationPath()}${useQueryKeysAsString()}`;

  useEffect(() => {
    if (currentLocation !== startUrl) {
      navigate(startUrl, { replace: true });
    }
  }, [currentLocation, navigate, startUrl]);

  return <Loader reason='navigate-to-process-start' />;
}

export const ProcessWrapper = () => {
  const isCurrentTask = useIsCurrentTask();
  const isValidTaskId = useIsValidTaskId();
  const taskIdParam = useNavigationParam('taskId');
  const taskType = useGetTaskTypeById()(taskIdParam);
  const process = useLaxProcessData();

  if (process?.ended) {
    return <NavigateToStartUrl />;
  }

  if (!isValidTaskId(taskIdParam)) {
    return (
      <PresentationComponent type={ProcessTaskType.Unknown}>
        <NavigationError label='general.invalid_task_id' />
      </PresentationComponent>
    );
  }

  if (!isCurrentTask) {
    return (
      <PresentationComponent type={ProcessTaskType.Unknown}>
        <NavigationError label='general.part_of_form_completed' />
      </PresentationComponent>
    );
  }

  if (taskType === ProcessTaskType.Confirm) {
    return (
      <ProcessNavigationProvider>
        <PresentationComponent type={ProcessTaskType.Confirm}>
          <Confirm />
        </PresentationComponent>
      </ProcessNavigationProvider>
    );
  }

  if (taskType === ProcessTaskType.Feedback) {
    return (
      <PresentationComponent type={ProcessTaskType.Feedback}>
        <Feedback />
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
              <PresentationComponent type={ProcessTaskType.Data}>
                <ComponentRouting />
              </PresentationComponent>
            }
          />
          <Route
            path='*'
            element={
              <PDFWrapper>
                <PresentationComponent type={ProcessTaskType.Data}>
                  <Form />
                </PresentationComponent>
              </PDFWrapper>
            }
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

  function isSubroutingNode(node: LayoutNode): node is LayoutNode<'Subform'> {
    return node.type === 'Subform' && !!node.def.subRouting;
  }

  if (isSubroutingNode(node)) {
    const SubRouting = node.def.subRouting;

    return (
      <SubRouting
        key={node.id}
        node={node}
      />
    );
  }

  // If node exists but does not implement sub routing
  throw new Error(`Component ${componentId} does not have subRouting`);
};
