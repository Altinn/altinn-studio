import type { ReactElement } from 'react';
import { StudioAlert, StudioHeading } from '@studio/components';
import { useTranslation } from 'react-i18next';
import type { WorkflowErrorEntry } from 'admin/features/apps/types/workflows/WorkflowStatus';
import {
  formatEngineErrorMessage,
  readEngineErrorMessage,
} from 'admin/features/apps/utils/engineErrorMessage';
import { formatTimestamp } from 'admin/features/apps/utils/formatTimestamp';

import classes from './EngineErrorMessage.module.css';

export type EngineErrorMessageProps = {
  entry: WorkflowErrorEntry;
};

/**
 * One recorded error as an alert: the problem title as its headline when the message carries
 * one, the whole message as the engine recorded it — its JSON body laid out, nothing left out —
 * and a footer with when, the HTTP status, how the engine classed the error, and the app's failure
 * code when it gave one. One faint red surface for the whole entry, message included; whether the
 * engine retried it or gave up is a fact in the footer, not a color.
 *
 * Engine and app text is rendered as its own node rather than interpolated into a translation
 * (i18next HTML-escapes interpolations), and set apart as verbatim technical output: it is English
 * runtime text, not part of the Norwegian copy around it.
 */
export const EngineErrorMessage = ({ entry }: EngineErrorMessageProps): ReactElement => {
  const { t } = useTranslation();
  const { title, failureCode } = readEngineErrorMessage(entry.message);
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
    <StudioAlert data-color='danger' data-size='sm' className={classes.entry}>
      {title && (
        <StudioHeading level={5} data-size='2xs' className={classes.engineText}>
          {title}
        </StudioHeading>
      )}
      <code className={`${classes.engineText} ${classes.message}`}>
        {formatEngineErrorMessage(entry.message)}
      </code>
      <span className={classes.meta}>
        {facts.join(' · ')}
        {failureCode && (
          <>
            {' · '}
            <code className={classes.engineText}>{failureCode}</code>
          </>
        )}
      </span>
    </StudioAlert>
  );
};
