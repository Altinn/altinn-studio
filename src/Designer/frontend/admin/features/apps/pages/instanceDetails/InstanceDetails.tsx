import { StudioHeading } from '@studio/components';
import { InstanceDataView } from './components/InstanceDataView';
import { InstanceWorkflows } from './components/InstanceWorkflows';
import { Breadcrumbs } from '../../components/Breadcrumbs/Breadcrumbs';
import classes from './InstanceDetails.module.css';
import { useRequiredRoutePathsParams } from 'admin/hooks/useRequiredRoutePathsParams';
import { useAppUsesWorkflowEngine } from 'admin/features/apps/hooks/useAppUsesWorkflowEngine';

export const InstanceDetails = () => {
  const {
    owner: org,
    app,
    environment,
    instanceId,
  } = useRequiredRoutePathsParams(['owner', 'environment', 'app', 'instanceId']);
  // The workflow engine's part of the page — the health in the info card, and the workflows card
  // — only for an app that runs its process on the engine. Any other app gets the page as it was
  // before the engine, and the engine is asked nothing about it.
  const usesWorkflowEngine = useAppUsesWorkflowEngine(org, environment, app);

  return (
    <div className={classes.container}>
      <Breadcrumbs
        org={org}
        routes={[
          { route: 'apps', environment },
          { route: 'app', environment, app },
          { route: 'instance', environment, app, instanceId },
        ]}
      />
      <StudioHeading data-size='lg'>{instanceId}</StudioHeading>
      <InstanceDataView
        org={org}
        environment={environment}
        app={app}
        id={instanceId}
        section='info'
        showWorkflowHealth={usesWorkflowEngine === true}
      />
      {usesWorkflowEngine && (
        <InstanceWorkflows org={org} environment={environment} app={app} instanceId={instanceId} />
      )}
      <InstanceDataView
        org={org}
        environment={environment}
        app={app}
        id={instanceId}
        section='dataElements'
      />
    </div>
  );
};
