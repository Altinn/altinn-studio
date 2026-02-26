import React from 'react';
import { StudioHeading } from '@studio/components';
import { useParams } from 'react-router-dom';
import { InstanceDataView } from './components/InstanceDataView';
import { Breadcrumbs } from 'admin/components/Breadcrumbs/Breadcrumbs';
import classes from './InstanceDetails.module.css';

export const InstanceDetails = () => {
  const { org, environment, app, instanceId } = useParams() as {
    org: string;
    environment: string;
    app: string;
    instanceId: string;
  };

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
