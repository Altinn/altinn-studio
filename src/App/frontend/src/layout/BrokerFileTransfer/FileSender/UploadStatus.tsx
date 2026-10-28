import React from 'react';

import { Button } from '@app/form-component';
import { Alert } from '@digdir/designsystemet-react';
import { PauseIcon, PlayIcon } from '@navikt/aksel-icons';

import { Lang } from 'src/features/language/Lang';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { FileRow } from 'src/layout/BrokerFileTransfer/FileRow';
import { CancelUploadButton } from 'src/layout/BrokerFileTransfer/FileSender/CancelUploadButton';
import classes from 'src/layout/BrokerFileTransfer/FileSender/UploadStatus.module.css';
import { formatFileSize, formatRemainingTime, uploadErrorMessage } from 'src/layout/BrokerFileTransfer/messages';
import utilClasses from 'src/styles/utils.module.css';
import type { UploadProgress } from 'src/layout/BrokerFileTransfer/brokerClient/tus/tusUpload';
import type { ActiveUpload } from 'src/layout/BrokerFileTransfer/brokerClient/upload/uploadController';
import type { Message } from 'src/layout/BrokerFileTransfer/messages';

type UploadStatusProps = {
  active: ActiveUpload;
  progress: UploadProgress | null;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
};

export function UploadStatus({ active, progress, onPause, onResume, onCancel }: UploadStatusProps) {
  const language = useCurrentLanguage();
  const { langAsString } = useLanguage();
  const { status } = active;
  const percent = progress?.percent ?? 0;
  const amounts = [
    percent,
    formatFileSize(progress?.loaded ?? 0, language),
    formatFileSize(progress?.total ?? active.fileSize, language),
  ];
  const statusText = statusMessage(status, amounts);
  const pace = status === 'uploading' && progress ? describePace(progress, language, langAsString) : '';
  const announcement: Message =
    status === 'uploading'
      ? { key: 'broker_file_transfer.progress_announcement', params: [Math.floor(percent / 10) * 10] }
      : statusText;
  const error = status === 'failed' ? uploadErrorMessage(active.error) : undefined;

  return (
    <div className={classes.container}>
      <FileRow
        name={active.fileName}
        details={
          <>
            <Lang
              id={statusText.key}
              params={statusText.params}
            />
            {pace}
          </>
        }
      />
      <progress
        className={classes.progress}
        value={percent}
        max={100}
        aria-label={langAsString('broker_file_transfer.progress_label')}
      />
      {/* The status above changes too often to be read aloud, so screen readers get it in tenths */}
      <span
        className={utilClasses.visuallyHidden}
        aria-live='polite'
      >
        <Lang
          id={announcement.key}
          params={announcement.params}
        />
      </span>
      {error && (
        <Alert data-color='danger'>
          <Lang
            id={error.key}
            params={error.params}
          />
        </Alert>
      )}
      <div className={classes.actions}>
        {(status === 'paused' || status === 'pausing' || status === 'failed') && (
          <Button
            variant='secondary'
            onClick={onResume}
          >
            <PlayIcon aria-hidden />
            <Lang id='broker_file_transfer.continue' />
          </Button>
        )}
        {status === 'uploading' && (
          <Button
            variant='secondary'
            onClick={onPause}
          >
            <PauseIcon aria-hidden />
            <Lang id='broker_file_transfer.pause' />
          </Button>
        )}
        {/* While finishing, Broker may already have the file, so cancelling can no longer undo it */}
        {status !== 'finishing' && (
          <CancelUploadButton
            label='broker_file_transfer.cancel'
            confirmLabel='broker_file_transfer.cancel_confirm_yes'
            onConfirm={onCancel}
          />
        )}
      </div>
    </div>
  );
}

// Speed and time left, as BrokerBox shows them, once there is enough to measure
function describePace(
  { bytesPerSecond, secondsRemaining }: UploadProgress,
  language: string,
  langAsString: ReturnType<typeof useLanguage>['langAsString'],
): string {
  const parts: string[] = [];
  if (bytesPerSecond !== null) {
    parts.push(`${formatFileSize(bytesPerSecond, language)}/s`);
  }
  if (secondsRemaining !== null) {
    const remaining = formatRemainingTime(secondsRemaining, language);
    parts.push(
      remaining
        ? langAsString('broker_file_transfer.time_remaining', [remaining])
        : langAsString('broker_file_transfer.less_than_a_minute_remaining'),
    );
  }
  return parts.map((part) => ` · ${part}`).join('');
}

function statusMessage(status: ActiveUpload['status'], amounts: (string | number)[]): Message {
  switch (status) {
    case 'initializing':
      return { key: 'broker_file_transfer.status_initializing' };
    case 'pausing':
      return { key: 'broker_file_transfer.status_pausing' };
    case 'paused':
      return { key: 'broker_file_transfer.status_paused', params: amounts };
    case 'failed':
      return { key: 'broker_file_transfer.status_failed', params: amounts };
    case 'finishing':
      return { key: 'broker_file_transfer.status_finishing' };
    default:
      return { key: 'broker_file_transfer.status_uploading', params: amounts };
  }
}
