import { Link, useParams } from 'react-router-dom';
import { StudioBreadcrumbs } from '@studio/components';
import { AppMetrics } from './components/AppMetrics';
import classes from './AppDetails.module.css';

export const AppsDetails = () => {
  const { org, env, app } = useParams() as { org: string; env: string; app: string };

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
      <div className={classes.metrics}>
        <AppMetrics />
      </div>
      <p>
        Gå til <Link to='instances'>instanser</Link>.
      </p>
    </div>
  );
};
