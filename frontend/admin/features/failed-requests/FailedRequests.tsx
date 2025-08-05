import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { FailedRequestsTable } from './components/FailedRequestsTable';
import { StudioBreadcrumbs } from '@studio/components';

export const FailedRequests = () => {
  const { org, env, app } = useParams();
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
              <Link to=''>{app}</Link>
            </StudioBreadcrumbs.Link>
          </StudioBreadcrumbs.Item>
        </StudioBreadcrumbs.List>
      </StudioBreadcrumbs>
      <h1>
        {env} / {app}
      </h1>
      <FailedRequestsTable org={org} env={env} app={app} />
    </div>
  );
};
