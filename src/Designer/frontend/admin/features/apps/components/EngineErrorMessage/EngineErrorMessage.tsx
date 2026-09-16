import { useState } from 'react';
import type { ReactElement } from 'react';
import { StudioButton, StudioList, StudioTag } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { CopyTextButton } from 'admin/features/apps/components/CopyTextButton/CopyTextButton';
import type { WorkflowErrorEntry } from 'admin/features/apps/types/workflows/WorkflowStatus';
import { parseEngineErrorMessage } from 'admin/features/apps/utils/engineErrorMessage';
import { formatDateAndTime } from 'admin/features/apps/utils/formatDateAndTime';

import classes from './EngineErrorMessage.module.css';

export type EngineErrorMessageProps = {
  entry: WorkflowErrorEntry;
};

/**
 * One recorded error, as the app runtime meant it: the problem title and detail unpacked from the
 * engine's message string, the HTTP status, whether the engine classed it as transient, and the
 * app's failure code when it gave one.
 *
 * Engine and app text is rendered as its own node rather than interpolated into a translation
 * (i18next HTML-escapes interpolations), and set apart as verbatim technical output: it is English
 * runtime text, not part of the Norwegian copy around it. The raw message stays one copy away.
 */
export const EngineErrorMessage = ({ entry }: EngineErrorMessageProps): ReactElement => {
  const { t } = useTranslation();
  const [isRawShown, setIsRawShown] = useState(false);
  const details = parseEngineErrorMessage(entry.message);
  const status = entry.httpStatusCode ?? details.status;
  // With a title but no detail (a validation problem), the raw JSON would only repeat the title.
  const isUnpacked = details.title !== undefined || details.detail !== undefined;
  const mainText = details.detail ?? (isUnpacked ? undefined : details.raw);

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
        <CopyTextButton text={entry.message} label={t('admin.workflows.error.copy')} />
      </div>
      {details.title && (
        <code className={`${classes.engineText} ${classes.title}`}>{details.title}</code>
      )}
      {mainText && <code className={classes.engineText}>{mainText}</code>}
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
      {details.prefix && <span className={classes.prefix}>{details.prefix}</span>}
      {isUnpacked && (
        <div className={classes.raw}>
          <StudioButton
            data-size='sm'
            variant='tertiary'
            aria-expanded={isRawShown}
            onClick={() => setIsRawShown((shown) => !shown)}
          >
            {isRawShown ? t('admin.workflows.error.raw_hide') : t('admin.workflows.error.raw')}
          </StudioButton>
          {isRawShown && <code className={classes.engineText}>{details.raw}</code>}
        </div>
      )}
    </div>
  );
};
