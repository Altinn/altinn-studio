import type { ReactElement } from 'react';
import { StudioHelpText, StudioParagraph, StudioTag } from '@studio/components';
import { useTranslation } from 'react-i18next';
import type { RunningAppStatus } from 'app-shared/types/api/RunningApp';

import classes from './AppStatusTag.module.css';

type AppStatusPresentation = {
  color: string;
  labelKey: string;
  descriptionKey: string;
};

/** The app's status as the runtime gateway reports it, or `unknown` when it could not tell. */
export type AppStatus = RunningAppStatus | 'unknown';

/** How each status reads in the list. The deploy page says the same in sentences. */
export const APP_STATUS_PRESENTATION: Record<AppStatus, AppStatusPresentation> = {
  unavailable: {
    color: 'danger',
    labelKey: 'admin.apps.status.unavailable',
    descriptionKey: 'admin.apps.status.unavailable_description',
  },
  stuck: {
    color: 'warning',
    labelKey: 'admin.apps.status.stuck',
    descriptionKey: 'admin.apps.status.stuck_description',
  },
  degraded: {
    color: 'warning',
    labelKey: 'admin.apps.status.degraded',
    descriptionKey: 'admin.apps.status.degraded_description',
  },
  updating: {
    color: 'info',
    labelKey: 'admin.apps.status.updating',
    descriptionKey: 'admin.apps.status.updating_description',
  },
  ready: {
    color: 'success',
    labelKey: 'admin.apps.status.ready',
    descriptionKey: 'admin.apps.status.ready_description',
  },
  unknown: {
    color: 'neutral',
    labelKey: 'admin.apps.status.unknown',
    descriptionKey: 'admin.apps.status.unknown_description',
  },
};

const STATUSES_NEEDING_ATTENTION: readonly AppStatus[] = ['unavailable', 'stuck', 'degraded'];

/** Whether the status asks someone to look at the app. Updating and unknown do not, on their own. */
export const needsAttention = (status: AppStatus): boolean =>
  STATUSES_NEEDING_ATTENTION.includes(status);

export const AppStatusTag = ({ status }: { status: AppStatus }): ReactElement => {
  const { t } = useTranslation();
  const { color, labelKey, descriptionKey } = APP_STATUS_PRESENTATION[status];

  return (
    <StudioTag data-size='sm' data-color={color} title={t(descriptionKey)}>
      {t(labelKey)}
    </StudioTag>
  );
};

/**
 * The column header, with the meaning of every status a tag can show, since a tag's own
 * description is only reachable with a mouse.
 */
export const AppStatusHeader = (): ReactElement => {
  const { t } = useTranslation();

  return (
    <span className={classes.header}>
      {t('admin.apps.status')}
      <StudioHelpText aria-label={t('admin.apps.status.legend')} placement='bottom'>
        <div className={classes.legendContent}>
          <StudioParagraph data-size='sm'>{t('admin.apps.status.legend')}</StudioParagraph>
          <dl className={classes.legend}>
            {(Object.keys(APP_STATUS_PRESENTATION) as AppStatus[]).map((status) => (
              <div key={status} className={classes.legendRow}>
                <dt>
                  <AppStatusTag status={status} />
                </dt>
                <dd className={classes.legendDescription}>
                  {t(APP_STATUS_PRESENTATION[status].descriptionKey)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </StudioHelpText>
    </span>
  );
};
