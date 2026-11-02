import React from 'react';

import { Button } from '@app/form-component';
import { Alert, ValidationMessage } from '@digdir/designsystemet-react';

import { Lang } from 'src/features/language/Lang';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import classes from 'src/layout/BrokerFileTransfer/ChooseFile/ChooseFile.module.css';
import { ChosenFile } from 'src/layout/BrokerFileTransfer/ChooseFile/ChosenFile';
import { FileDropzone } from 'src/layout/BrokerFileTransfer/ChooseFile/FileDropzone';
import { fileProblem } from 'src/layout/BrokerFileTransfer/messages';
import { useAllowedFileEndings } from 'src/layout/BrokerFileTransfer/setup/useBrokerSetup';
import { useFilePick } from 'src/layout/BrokerFileTransfer/uploadState/useFilePick';

// Stands in for ChooseFile where the app can't reach Broker, such as in Studio's preview: it can't send

type ChooseFileWithoutBrokerProps = {
  baseComponentId: string;
  maxFileSize: number | null;
};

export function ChooseFileWithoutBroker({ baseComponentId, maxFileSize }: ChooseFileWithoutBrokerProps) {
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
