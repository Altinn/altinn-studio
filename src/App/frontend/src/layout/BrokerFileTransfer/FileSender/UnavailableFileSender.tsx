import React from 'react';

import { Button } from '@app/form-component';
import { Alert, ValidationMessage } from '@digdir/designsystemet-react';

import { Lang } from 'src/features/language/Lang';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { ChosenFile } from 'src/layout/BrokerFileTransfer/FileSender/ChosenFile';
import { FileDropzone } from 'src/layout/BrokerFileTransfer/FileSender/FileDropzone';
import classes from 'src/layout/BrokerFileTransfer/FileSender/FileSender.module.css';
import { useFilePick } from 'src/layout/BrokerFileTransfer/FileSender/useFilePick';
import { fileProblem } from 'src/layout/BrokerFileTransfer/messages';
import { useAllowedFileEndings } from 'src/layout/BrokerFileTransfer/useBrokerSetup';

type UnavailableFileSenderProps = {
  baseComponentId: string;
  maxFileSize: number | null;
};

// Where the app can't reach Broker, such as in Studio's preview, the component looks as usual but can't send
export function UnavailableFileSender({ baseComponentId, maxFileSize }: UnavailableFileSenderProps) {
  const language = useCurrentLanguage();
  const allowedFileEndings = useAllowedFileEndings(baseComponentId);
  const { file, pickError, pick, remove } = useFilePick(baseComponentId, allowedFileEndings);
  const problem = pickError ?? (file ? fileProblem(file, maxFileSize, language) : undefined);

  return (
    <div className={classes.container}>
      {file ? (
        <ChosenFile
          file={file}
          onRemove={remove}
        />
      ) : (
        <FileDropzone
          baseComponentId={baseComponentId}
          maxFileSize={maxFileSize}
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
      <Alert
        data-color='info'
        data-size='sm'
      >
        <Lang id='broker_file_transfer.unavailable' />
      </Alert>
      <div className={classes.actions}>
        <Button disabled>
          <Lang id='broker_file_transfer.send' />
        </Button>
      </div>
    </div>
  );
}
