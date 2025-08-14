import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { InstancesTable } from './components/InstancesTable';
import { StudioBreadcrumbs } from '@studio/components';
import { ProcessTaskPicker } from './components/ProcessTaskPicker';

export const Instances = () => {
  const { org, env, app } = useParams();
  const [currentTaskFilter, setCurrentTaskFilter] = useState<string | null>(null);

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
      <ProcessTaskPicker
        org={org}
        env={env}
        app={app}
        value={currentTaskFilter}
        onChange={setCurrentTaskFilter}
      />
      <InstancesTable org={org} env={env} app={app} currentTask={currentTaskFilter} />
    </div>
  );
};
