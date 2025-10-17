import React from 'react';
import classes from './Instances.module.css';
import { Link, useParams } from 'react-router-dom';
import { InstancesTable } from './components/InstancesTable';
import { StudioBreadcrumbs } from '@studio/components';
import { ProcessTaskPicker, useProcessTaskPicker } from './components/ProcessTaskPicker';

export const Instances = () => {
  const { org, env, app } = useParams();
  const processTaskPickerState = useProcessTaskPicker();

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
              <Link to={`/${org}/apps/${env}/${app}`}>{app}</Link>
            </StudioBreadcrumbs.Link>
          </StudioBreadcrumbs.Item>
          <StudioBreadcrumbs.Item>
            <StudioBreadcrumbs.Link asChild>
              <Link to=''>Instanser</Link>
            </StudioBreadcrumbs.Link>
          </StudioBreadcrumbs.Item>
        </StudioBreadcrumbs.List>
      </StudioBreadcrumbs>
      <h1>
        {env} / {app} / Instanser
      </h1>
      <div className={classes.filterWrapper}>
        <ProcessTaskPicker org={org} env={env} app={app} state={processTaskPickerState} />
      </div>
      <InstancesTable
        org={org}
        env={env}
        app={app}
        currentTask={processTaskPickerState.currentTask}
        processIsComplete={processTaskPickerState.isComplete}
      />
    </div>
  );
};
