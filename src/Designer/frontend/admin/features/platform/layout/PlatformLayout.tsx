import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StudioSelect, StudioTabs } from '@studio/components';
import { useQueryParamState } from 'admin/features/apps/hooks/useQueryParamState';
import { PeriodSelect } from 'admin/features/apps/components/PeriodSelect/PeriodSelect';
import { DEFAULT_SEARCH_PARAMS } from 'admin/constants/constants';
import { RoutePaths } from 'admin/routes/RoutePaths';
import classes from './PlatformLayout.module.css';

/** The environments the nightly collection covers; the test environments are left out on purpose. */
export const PLATFORM_ENVIRONMENTS = ['production', 'tt02'];

export type PlatformOutletContext = {
  environment: string;
  periodDays: number;
};

/**
 * The platform-wide admin pages for the Studio team: every service owner in one environment, and
 * every app across them. Environment and period live in the query string, so a link to a page
 * carries them along.
 */
export const PlatformLayout = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const [environment, setEnvironment] = useQueryParamState<string>(
    'environment',
    DEFAULT_SEARCH_PARAMS.environment,
  );
  const [period, setPeriod] = useQueryParamState<number>('period', DEFAULT_SEARCH_PARAMS.period);
  const activeEnvironment =
    environment && PLATFORM_ENVIRONMENTS.includes(environment)
      ? environment
      : DEFAULT_SEARCH_PARAMS.environment;
  const periodDays = period ?? DEFAULT_SEARCH_PARAMS.period;
  const activeTab = pathname.replace(/\/$/, '').endsWith(`/${RoutePaths.PlatformApps}`)
    ? RoutePaths.PlatformApps
    : RoutePaths.Platform;

  const context: PlatformOutletContext = { environment: activeEnvironment, periodDays };

  return (
    <div className={classes.page}>
      <h1>{t('admin.platform.title')}</h1>
      <div className={classes.toolbar}>
        <StudioSelect
          label={t('admin.platform.environment')}
          value={activeEnvironment}
          onChange={(e) => setEnvironment(e.target.value)}
          className={classes.select}
        >
          {PLATFORM_ENVIRONMENTS.map((env) => (
            <StudioSelect.Option key={env} value={env}>
              {t('admin.environment.name', { environment: env })}
            </StudioSelect.Option>
          ))}
        </StudioSelect>
        <PeriodSelect value={periodDays} onChange={setPeriod} />
      </div>
      <StudioTabs
        value={activeTab}
        onChange={(tab: string) =>
          navigate({
            pathname:
              tab === RoutePaths.PlatformApps
                ? `/${RoutePaths.Platform}/${RoutePaths.PlatformApps}`
                : `/${RoutePaths.Platform}`,
            search,
          })
        }
      >
        <StudioTabs.List>
          <StudioTabs.Tab value={RoutePaths.Platform}>
            {t('admin.platform.tab.service_owners')}
          </StudioTabs.Tab>
          <StudioTabs.Tab value={RoutePaths.PlatformApps}>
            {t('admin.platform.tab.all_apps')}
          </StudioTabs.Tab>
        </StudioTabs.List>
        <StudioTabs.Panel value={activeTab}>
          <Outlet context={context} />
        </StudioTabs.Panel>
      </StudioTabs>
    </div>
  );
};
