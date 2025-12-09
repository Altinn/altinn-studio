import { Link, useParams } from 'react-router-dom';
import { StudioBreadcrumbs } from '@studio/components';
import { AppMetrics } from './components/AppMetrics';
import classes from './AppDetails.module.css';
import { useTranslation } from 'react-i18next';

export const AppsDetails = () => {
  const { t } = useTranslation();
  const { org, env, app } = useParams() as { org: string; env: string; app: string };

  return (
    <div>
      <StudioBreadcrumbs>
        <StudioBreadcrumbs.Link>{app}</StudioBreadcrumbs.Link>
        <StudioBreadcrumbs.List>
          <StudioBreadcrumbs.Item>
            <StudioBreadcrumbs.Link asChild>
              <Link to={`/${org}/apps`}>{t('admin.apps.title')}</Link>
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
