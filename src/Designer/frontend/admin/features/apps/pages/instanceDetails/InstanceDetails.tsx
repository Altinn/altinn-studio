import { StudioHeading } from '@studio/components';
import { InstanceDataView } from './components/InstanceDataView';
import { Breadcrumbs } from '../../components/Breadcrumbs/Breadcrumbs';
import classes from './InstanceDetails.module.css';
import { useRequiredRoutePathsParams } from 'admin/hooks/useRequiredRoutePathsParams';

export const InstanceDetails = () => {
  const {
    owner: org,
    app,
    environment,
    instanceId,
  } = useRequiredRoutePathsParams(['owner', 'environment', 'app', 'instanceId']);

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
      <InstanceDataView org={org} environment={environment} app={app} id={instanceId} />
    </div>
  );
};
