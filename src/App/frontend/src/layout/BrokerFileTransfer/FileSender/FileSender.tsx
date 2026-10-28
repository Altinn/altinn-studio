import React from 'react';

import { Button } from '@app/form-component';
import { Alert, ValidationMessage } from '@digdir/designsystemet-react';

import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { Lang } from 'src/features/language/Lang';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { expectedFileSize, isSameFile } from 'src/layout/BrokerFileTransfer/brokerClient/upload/interruptedTransfer';
import { CancelUploadButton } from 'src/layout/BrokerFileTransfer/FileSender/CancelUploadButton';
import { ChosenFile } from 'src/layout/BrokerFileTransfer/FileSender/ChosenFile';
import { FileDropzone } from 'src/layout/BrokerFileTransfer/FileSender/FileDropzone';
import classes from 'src/layout/BrokerFileTransfer/FileSender/FileSender.module.css';
import { InterruptedUploadNotice } from 'src/layout/BrokerFileTransfer/FileSender/InterruptedUploadNotice';
import { UploadStatus } from 'src/layout/BrokerFileTransfer/FileSender/UploadStatus';
import { useFilePick } from 'src/layout/BrokerFileTransfer/FileSender/useFilePick';
import { fileProblem, sendErrorMessage } from 'src/layout/BrokerFileTransfer/messages';
import { useAllowedFileEndings } from 'src/layout/BrokerFileTransfer/useBrokerSetup';
import { useBrokerUpload } from 'src/layout/BrokerFileTransfer/useBrokerUpload';
import type { Message } from 'src/layout/BrokerFileTransfer/messages';
import type { ReadySetup } from 'src/layout/BrokerFileTransfer/useBrokerSetup';

type FileSenderProps = {
  baseComponentId: string;
  setup: ReadySetup;
};

export function FileSender({ baseComponentId, setup }: FileSenderProps) {
  const upload = useBrokerUpload(baseComponentId, setup);
  const language = useCurrentLanguage();
  const allowedFileEndings = useAllowedFileEndings(baseComponentId);
  const { file, pickError, pick, remove } = useFilePick(baseComponentId, allowedFileEndings);

  if (upload.active) {
    return (
      <UploadStatus
        active={upload.active}
        progress={upload.progress}
        onPause={upload.pause}
        onResume={upload.resume}
        onCancel={upload.cancel}
      />
    );
  }

  if (upload.interrupted?.kind === 'checking') {
    return <AltinnSpinner />;
  }
  if (upload.interrupted?.kind === 'unknown') {
    return (
      <div className={classes.container}>
        <Alert data-color='warning'>
          <Lang id='broker_file_transfer.error_interrupted_unknown' />
        </Alert>
        <div className={classes.actions}>
          <CancelUploadButton
            label='broker_file_transfer.discard_upload'
            confirmLabel='broker_file_transfer.discard_confirm_yes'
            onConfirm={upload.discardInterrupted}
          />
        </div>
      </div>
    );
  }

  const interrupted = upload.interrupted;
  const wrongFile: Message | undefined =
    interrupted && file && !isSameFile(interrupted, file)
      ? { key: 'broker_file_transfer.wrong_file', params: [interrupted.fileName] }
      : undefined;
  const problem = pickError ?? wrongFile ?? (file ? fileProblem(file, setup.maxFileSize, language) : undefined);
  const sendError = upload.sendError !== null ? sendErrorMessage(upload.sendError) : undefined;

  return (
    <div className={classes.container}>
      {interrupted && (
        <InterruptedUploadNotice
          fileName={interrupted.fileName}
          uploaded={interrupted.uploaded}
          size={expectedFileSize(interrupted)}
        />
      )}
      {file ? (
        <ChosenFile
          file={file}
          onRemove={remove}
        />
      ) : (
        <FileDropzone
          baseComponentId={baseComponentId}
          maxFileSize={setup.maxFileSize}
          hasError={!!problem}
          onDrop={pick}
        />
      )}
      {problem && (
        <ValidationMessage data-size='sm'>
          <Lang
            id={problem.key}
            params={problem.params}
          />
        </ValidationMessage>
      )}
      {sendError && (
        <Alert data-color='danger'>
          <Lang
            id={sendError.key}
            params={sendError.params}
          />
        </Alert>
      )}
      <div className={classes.actions}>
        {interrupted ? (
          <>
            <Button
              disabled={!file || !!problem}
              onClick={() => file && upload.continueInterrupted(file)}
            >
              <Lang id='broker_file_transfer.continue_upload' />
            </Button>
            <CancelUploadButton
              label='broker_file_transfer.discard_upload'
              confirmLabel='broker_file_transfer.discard_confirm_yes'
              onConfirm={upload.discardInterrupted}
            />
          </>
        ) : (
          <Button
            disabled={!file || !!problem}
            onClick={() => file && upload.send(file)}
          >
            <Lang id='broker_file_transfer.send' />
          </Button>
        )}
      </div>
    </div>
  );
}
