import type { ReactElement } from 'react';
import { StudioList, StudioTag } from '@studio/components';
import { useTranslation } from 'react-i18next';
import type { WorkflowErrorEntry } from 'admin/features/apps/types/workflows/WorkflowStatus';
import { parseEngineErrorMessage } from 'admin/features/apps/utils/engineErrorMessage';
import { formatDateAndTime } from 'admin/features/apps/utils/formatDateAndTime';

import classes from './EngineErrorMessage.module.css';

export type EngineErrorMessageProps = {
  entry: WorkflowErrorEntry;
};

/**
 * One recorded error: the HTTP status, whether the engine classed it as transient, and the app's
 * failure code when it gave one; then the problem title, detail, validation errors and every other
 * field unpacked from the engine's message string — or the message as it came, when it carried
 * no problem body to unpack. Nothing the engine recorded is dropped, and nothing is said twice.
 *
 * Engine and app text is rendered as its own node rather than interpolated into a translation
 * (i18next HTML-escapes interpolations), and set apart as verbatim technical output: it is English
 * runtime text, not part of the Norwegian copy around it.
 */
export const EngineErrorMessage = ({ entry }: EngineErrorMessageProps): ReactElement => {
  const { t } = useTranslation();
  const details = parseEngineErrorMessage(entry.message);
  const status = entry.httpStatusCode ?? details.status;
  const isUnpacked = details.title !== undefined || details.detail !== undefined;

  return (
    <div className={classes.entry}>
      <div className={classes.meta}>
        <span>{formatDateAndTime(entry.timestamp)}</span>
        {status !== undefined && status !== null && (
          <StudioTag data-size='sm' data-color='neutral'>
            {t('admin.workflows.error.http_status', { status })}
          </StudioTag>
        )}
        <StudioTag data-size='sm' data-color={entry.wasRetryable ? 'info' : 'warning'}>
          {entry.wasRetryable
            ? t('admin.workflows.error.retryable')
            : t('admin.workflows.error.non_retryable')}
        </StudioTag>
        {details.failureCode && (
          <span>
            {t('admin.workflows.error.failure_code')}:{' '}
            <code className={classes.engineText}>{details.failureCode}</code>
          </span>
        )}
      </div>
      {details.title && (
        <code className={`${classes.engineText} ${classes.title}`}>{details.title}</code>
      )}
      {details.detail && <code className={classes.engineText}>{details.detail}</code>}
      {details.validationErrors && (
        <StudioList.Unordered className={classes.validationErrors}>
          {details.validationErrors.map((line, index) => (
            <StudioList.Item key={`${index}-${line}`}>
              <code className={classes.engineText}>{line}</code>
            </StudioList.Item>
          ))}
        </StudioList.Unordered>
      )}
      {details.extensions && (
        <dl className={classes.extensions}>
          {details.extensions.map(([key, value]) => (
            <div key={key} className={classes.extension}>
              <dt>
                <code className={classes.engineText}>{key}</code>
              </dt>
              <dd>
                <code className={classes.engineText}>{value}</code>
              </dd>
            </div>
          ))}
        </dl>
      )}
      {!isUnpacked && <code className={classes.engineText}>{details.raw}</code>}
    </div>
  );
};
