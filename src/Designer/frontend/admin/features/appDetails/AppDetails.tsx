import { Link, useParams } from 'react-router-dom';
import { StudioBreadcrumbs } from '@studio/components';
import { AppMetrics } from './components/AppMetrics';
import { useTranslation } from 'react-i18next';
import { useQueryParamState } from 'admin/hooks/useQueryParamState';
import classes from './AppDetails.module.css';

export const AppsDetails = () => {
  const { t } = useTranslation();
  const { org, env, app } = useParams() as { org: string; env: string; app: string };
  const defaultRange = 1440;
  const [range, setRange] = useQueryParamState<number>('range', defaultRange);

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
              <Link to={`${range && range !== defaultRange ? '?range=' + range : ''}`}>{app}</Link>
            </StudioBreadcrumbs.Link>
          </StudioBreadcrumbs.Item>
        </StudioBreadcrumbs.List>
      </StudioBreadcrumbs>
      <h1>
        {env} / {app}
      </h1>
      <div className={classes.container}>
        <AppMetrics range={range!} setRange={setRange} />
      </div>
      <p>
        Gå til <Link to='instances'>instanser</Link>.
      </p>
    </div>
  );
};
