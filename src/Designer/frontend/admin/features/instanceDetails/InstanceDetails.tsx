import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { InstanceDataView } from './components/InstanceDataView';
import { StudioBreadcrumbs } from '@studio/components';

export const InstanceDetails = () => {
  const { org, env, app, instanceId } = useParams() as {
    org: string;
    env: string;
    app: string;
    instanceId: string;
  };
  return (
    <div>
      <StudioBreadcrumbs>
        <StudioBreadcrumbs.Link>{app}</StudioBreadcrumbs.Link>
        <StudioBreadcrumbs.List>
          <StudioBreadcrumbs.Item>
            <StudioBreadcrumbs.Link asChild>
              <Link to={`/${org}/apps`}>Publiserte apper</Link>
            </StudioBreadcrumbs.Link>
          </StudioBreadcrumbs.Item>
          <StudioBreadcrumbs.Item>
            <StudioBreadcrumbs.Link asChild>
              <Link to={`/${org}/apps/${env}/${app}/`}>{app}</Link>
            </StudioBreadcrumbs.Link>
          </StudioBreadcrumbs.Item>
          <StudioBreadcrumbs.Item>
            <StudioBreadcrumbs.Link asChild>
              <Link to=''>{instanceId}</Link>
            </StudioBreadcrumbs.Link>
          </StudioBreadcrumbs.Item>
        </StudioBreadcrumbs.List>
      </StudioBreadcrumbs>
      <h1>{instanceId}</h1>
      <InstanceDataView org={org} env={env} app={app} id={instanceId} />
    </div>
  );
};
