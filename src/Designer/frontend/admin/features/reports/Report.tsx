import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import 'chartjs-adapter-date-fns';
import {
  Chart as ChartJS,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Filler,
  TimeScale,
} from 'chart.js';
import { useReportDataQuery } from './hooks/useReportDataQuery';
import { AppMetric } from 'admin/features/apps/pages/appDetails/components/AppMetric';
import { AppErrorMetric } from 'admin/features/apps/pages/appDetails/components/AppErrorMetric';
import classes from './Report.module.css';

ChartJS.register(LinearScale, BarElement, ArcElement, Title, Tooltip, Filler, TimeScale);
ChartJS.defaults.animation = false;
ChartJS.defaults.devicePixelRatio = 2;

// CSS mask is not rasterized by Puppeteer when generating PDFs.
// Work-around: switch ::before to background-image and override --dsc-alert-icon-url with
// colored SVG data URLs (fill color baked in) for each alert type.
const PDF_ALERT_ICON_CSS = [
  '.ds-alert::before,.ds-alert>:is(h1,h2,h3,h4,h5,h6):first-child::before{',
  '-webkit-mask:none!important;mask:none!important;',
  'background-color:transparent!important;',
  'background-image:var(--dsc-alert-icon-url)!important;',
  'background-size:contain!important;background-repeat:no-repeat!important;',
  'background-position:center!important;padding:0!important}',
  // info (#0860a3) — also covers the default alert state
  `.ds-alert,.ds-alert[data-color=info]{--dsc-alert-icon-url:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%230860a3' fill-rule='evenodd' d='M3.25 4A.75.75 0 0 1 4 3.25h16a.75.75 0 0 1 .75.75v16a.75.75 0 0 1-.75.75H4a.75.75 0 0 1-.75-.75zM11 7.75a1 1 0 1 1 2 0 1 1 0 0 1-2 0m-1.25 3a.75.75 0 0 1 .75-.75H12a.75.75 0 0 1 .75.75v4.75h.75a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1 0-1.5h.75v-4h-.75a.75.75 0 0 1-.75-.75'/%3E%3C/svg%3E")}`,
  // success (#056d13)
  `.ds-alert[data-color=success]{--dsc-alert-icon-url:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23056d13' fill-rule='evenodd' d='M12 21.75a9.75 9.75 0 1 0 0-19.5 9.75 9.75 0 0 0 0 19.5m4.95-12.47a.81.81 0 0 0-1.24-1.05l-5.39 6.36-2.62-2.62a.81.81 0 0 0-1.15 1.15l3.25 3.25a.81.81 0 0 0 1.2-.05z'/%3E%3C/svg%3E")}`,
  // danger (#b81a1a)
  `.ds-alert[data-color=danger]{--dsc-alert-icon-url:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23b81a1a' fill-rule='evenodd' d='M7.74 2.47a.75.75 0 0 1 .53-.22h7.46a.75.75 0 0 1 .53.22l5.27 5.27c.14.14.22.33.22.53v7.46a.75.75 0 0 1-.22.53l-5.27 5.27a.75.75 0 0 1-.53.22H8.27a.75.75 0 0 1-.53-.22l-5.27-5.27a.75.75 0 0 1-.22-.53V8.27a.75.75 0 0 1 .22-.53zm1.29 5.5a.75.75 0 0 0-1.06 1.06L10.94 12l-2.97 2.97a.75.75 0 1 0 1.06 1.06L12 13.06l2.97 2.97a.75.75 0 1 0 1.06-1.06L13.06 12l2.97-2.97a.75.75 0 0 0-1.06-1.06L12 10.94z'/%3E%3C/svg%3E")}`,
  // warning (#80540f)
  `.ds-alert[data-color=warning]{--dsc-alert-icon-url:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%2380540f' fill-rule='evenodd' d='M12 2.25a.75.75 0 0 1 .66.39l9.52 17.25a.75.75 0 0 1-.65 1.11H2.47a.75.75 0 0 1-.65-1.11l9.52-17.25a.75.75 0 0 1 .66-.39m0 6.5a.75.75 0 0 1 .75.75v4a.75.75 0 0 1-1.5 0v-4a.75.75 0 0 1 .75-.75m-1 7.75a1 1 0 1 1 2 0 1 1 0 0 1-2 0'/%3E%3C/svg%3E")}`,
].join('');

const RANGE_MINUTES: Record<string, number> = {
  daily: 24 * 60,
  weekly: 7 * 24 * 60,
  monthly: 30 * 24 * 60,
};

const formatDate = (isoString: string) => new Date(isoString).toLocaleString('nb-NO');

export const Report = () => {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const org = params.get('org') ?? '';
  const env = params.get('env') ?? '';
  const frequency = params.get('frequency') ?? 'daily';
  const range = RANGE_MINUTES[frequency] ?? RANGE_MINUTES.daily;

  const { data, isPending, isError } = useReportDataQuery(org, env, token);

  useEffect(() => {
    if (!isPending) {
      requestAnimationFrame(() => {
        document.body.setAttribute('data-status', 'ready');
      });
    }
  }, [isPending]);

  if (isPending) {
    return null;
  }

  if (isError || !data) {
    return <p>{t('admin.report.error_loading')}</p>;
  }

  return (
    <div className={classes.container}>
      <style>{PDF_ALERT_ICON_CSS}</style>
      <h1 className={classes.title}>{t('admin.report.title')}</h1>
      <table className={classes.metaTable}>
        <tr>
          <td className={classes.metaCell}>
            <b>{t('admin.report.org')}:</b>
          </td>
          <td className={classes.metaCell}>{data.org}</td>
        </tr>
        <tr>
          <td className={classes.metaCell}>
            <b>{t('admin.environment')}:</b>
          </td>
          <td className={classes.metaCell}>{data.environment}</td>
        </tr>
        <tr>
          <td className={classes.metaCell}>
            <b>{t('admin.report.period')}:</b>
          </td>
          <td className={classes.metaCell}>
            {formatDate(data.from)} – {formatDate(data.to)}
          </td>
        </tr>
        <tr>
          <td className={classes.metaCell}>
            <b>{t('admin.report.generated')}:</b>
          </td>
          <td className={classes.metaCell}>{formatDate(data.to)}</td>
        </tr>
      </table>
      {data.apps.length === 0 && <p className={classes.noApps}>{t('admin.report.no_apps')}</p>}
      {data.apps.map((app) => {
        const hasData =
          app.errorMetrics.some((m) => m.timestamps.length > 0) ||
          app.metrics.some((m) => m.timestamps.length > 0);
        return (
          <section key={app.appName}>
            <h2 className={classes.appTitle}>{app.appName}</h2>
            {hasData ? (
              <div className={classes.metricsContainer}>
                {app.errorMetrics.map((m) => (
                  <AppErrorMetric
                    key={m.name}
                    metric={m}
                    range={range}
                    className={classes.metricItem}
                  />
                ))}
                {app.metrics.map((m) => (
                  <AppMetric key={m.name} metric={m} range={range} className={classes.metricItem} />
                ))}
              </div>
            ) : (
              <p className={classes.noApps}>{t('admin.report.no_metrics')}</p>
            )}
          </section>
        );
      })}
    </div>
  );
};
