import React from 'react';

import { Button } from '@app/form-component';
import { Alert } from '@digdir/designsystemet-react';

import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { Lang } from 'src/features/language/Lang';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { expectedFileSize, isSameFile } from 'src/layout/BrokerFileTransfer/brokerClient/upload/interruptedTransfer';
import { CancelUploadButton } from 'src/layout/BrokerFileTransfer/CancelUploadButton';
import { ChecksumField } from 'src/layout/BrokerFileTransfer/ChecksumField';
import classes from 'src/layout/BrokerFileTransfer/ChooseFile/ChooseFile.module.css';
import { FilePicker } from 'src/layout/BrokerFileTransfer/ChooseFile/FilePicker';
import { InterruptedUploadNotice } from 'src/layout/BrokerFileTransfer/ChooseFile/InterruptedUploadNotice';
import { checksumProblem, fileProblem, sendErrorMessage } from 'src/layout/BrokerFileTransfer/messages';
import { useAllowedFileEndings } from 'src/layout/BrokerFileTransfer/setup/useBrokerSetup';
import { useFilePick } from 'src/layout/BrokerFileTransfer/uploadState/useFilePick';
import { useComponentConfig } from 'src/utils/layout/hooks';
import type { Message } from 'src/layout/BrokerFileTransfer/messages';
import type { ReadySetup } from 'src/layout/BrokerFileTransfer/setup/useBrokerSetup';
import type { InterruptedState } from 'src/layout/BrokerFileTransfer/uploadState/useBrokerUpload';

type ChooseFileProps = {
  baseComponentId: string;
  setup: ReadySetup;
  interrupted: InterruptedState | null;
  sendError: unknown;
  onSend: (file: File, checksum: string | undefined) => Promise<void>;
  onContinue: (file: File) => Promise<void>;
  onDiscard: () => void;
};

/** Lets the user choose a file and send it, or continue or discard an interrupted upload */
export function ChooseFile({
  baseComponentId,
  setup,
  interrupted,
  sendError,
  onSend,
  onContinue,
  onDiscard,
}: ChooseFileProps) {
  const language = useCurrentLanguage();
  const allowedFileEndings = useAllowedFileEndings(baseComponentId);
  const { file, pickError, checksum, pick, remove, setChecksum } = useFilePick(baseComponentId, allowedFileEndings);
  const { checksum: checksumSetting } = useComponentConfig(baseComponentId, 'BrokerFileTransfer');

  if (interrupted?.kind === 'checking') {
    return <AltinnSpinner />;
  }
  if (interrupted?.kind === 'unknown') {
    return (
      <div className={classes.container}>
        <Alert data-color='warning'>
          <Lang id='broker_file_transfer.error_interrupted_unknown' />
        </Alert>
        <div className={classes.actions}>
          <CancelUploadButton
            label='broker_file_transfer.discard_upload'
            confirmLabel='broker_file_transfer.discard_confirm_yes'
            onConfirm={onDiscard}
          />
        </div>
      </div>
    );
  }

  const wrongFile: Message | undefined =
    interrupted && file && !isSameFile(interrupted, file)
      ? { key: 'broker_file_transfer.wrong_file', params: [interrupted.fileName] }
      : undefined;
  // An interrupted file transfer already has its recipients, checksum and metadata
  const transferProblem = interrupted ? undefined : (setup.recipientsProblem ?? setup.metadataProblem);
  const checksumToSend = checksumSetting && checksum ? checksum : undefined;
  // The checksum field says what is wrong with the checksum, so here it only holds back sending
  const isChecksumReady = checksumToSend ? !checksumProblem(checksumToSend) : checksumSetting !== 'required';
  const problem =
    pickError ?? wrongFile ?? (file ? (fileProblem(file, setup.maxFileSize, language) ?? transferProblem) : undefined);
  const error = sendError !== null ? sendErrorMessage(sendError) : undefined;

  return (
    <div className={classes.container}>
      {interrupted && (
        <InterruptedUploadNotice
          fileName={interrupted.fileName}
          uploaded={interrupted.uploaded}
          size={expectedFileSize(interrupted)}
        />
      )}
      <FilePicker
        baseComponentId={baseComponentId}
        maxFileSize={setup.maxFileSize}
        file={file}
        problem={problem}
        onPick={pick}
        onRemove={remove}
      />
      {error && (
        <Alert data-color='danger'>
          <Lang
            id={error.key}
            params={error.params}
          />
        </Alert>
      )}
      {interrupted && (
        <div className={classes.actions}>
          <Button
            disabled={!file || !!problem}
            onClick={() => file && onContinue(file)}
          >
            <Lang id='broker_file_transfer.continue_upload' />
          </Button>
          <CancelUploadButton
            label='broker_file_transfer.discard_upload'
            confirmLabel='broker_file_transfer.discard_confirm_yes'
            onConfirm={onDiscard}
          />
        </div>
      )}
      <ChecksumField
        baseComponentId={baseComponentId}
        value={interrupted ? (interrupted.checksum ?? '') : checksum}
        onChange={interrupted ? undefined : setChecksum}
      />
      {!interrupted && (
        <div className={classes.actions}>
          <Button
            disabled={!file || !!problem || !isChecksumReady}
            onClick={() => file && onSend(file, checksumToSend)}
          >
            <Lang id='broker_file_transfer.send' />
          </Button>
        </div>
      )}
    </div>
  );
}
