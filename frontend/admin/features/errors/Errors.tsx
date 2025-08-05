import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ErrorsTable } from './components/ErrorsTable';
import { StudioBreadcrumbs } from '@studio/components';

export const Errors = () => {
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
      <ErrorsTable org={org} env={env} app={app} />
    </div>
  );
};
