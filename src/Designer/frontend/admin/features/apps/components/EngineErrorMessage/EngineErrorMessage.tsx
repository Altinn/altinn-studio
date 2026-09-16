import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { WorkflowErrorEntry } from 'admin/features/apps/types/workflows/WorkflowStatus';
import { failureCodeOf } from 'admin/features/apps/utils/engineErrorMessage';
import { formatTimestamp } from 'admin/features/apps/utils/formatTimestamp';

import classes from './EngineErrorMessage.module.css';

export type EngineErrorMessageProps = {
  entry: WorkflowErrorEntry;
};

/**
 * One recorded error, in two lines: when, with the HTTP status, whether the engine classed it as
 * transient, and the app's failure code when it gave one; then the whole message as the engine
 * recorded it. Nothing is unpacked out of the message and said twice.
 *
 * Engine and app text is rendered as its own node rather than interpolated into a translation
 * (i18next HTML-escapes interpolations), and set apart as verbatim technical output: it is English
 * runtime text, not part of the Norwegian copy around it.
 */
export const EngineErrorMessage = ({ entry }: EngineErrorMessageProps): ReactElement => {
  const { t } = useTranslation();
  const failureCode = failureCodeOf(entry.message);
  const facts = [
    formatTimestamp(entry.timestamp, 'milliseconds'),
    entry.httpStatusCode != null
      ? t('admin.workflows.error.http_status', { status: entry.httpStatusCode })
      : undefined,
    entry.wasRetryable
      ? t('admin.workflows.error.retryable')
      : t('admin.workflows.error.non_retryable'),
  ].filter((fact): fact is string => fact !== undefined);

  return (
    <div className={classes.entry}>
      <span className={classes.meta}>
        {facts.join(' · ')}
        {failureCode && (
          <>
            {' · '}
            <code className={classes.engineText}>{failureCode}</code>
          </>
        )}
      </span>
      <code className={`${classes.engineText} ${classes.message}`}>{entry.message}</code>
    </div>
  );
};
