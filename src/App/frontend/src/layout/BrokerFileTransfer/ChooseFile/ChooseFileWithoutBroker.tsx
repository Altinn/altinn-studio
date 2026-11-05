import React from 'react';

import { Button } from '@app/form-component';
import { Alert } from '@digdir/designsystemet-react';

import { Lang } from 'src/features/language/Lang';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import classes from 'src/layout/BrokerFileTransfer/ChooseFile/ChooseFile.module.css';
import { FilePicker } from 'src/layout/BrokerFileTransfer/ChooseFile/FilePicker';
import { fileProblem } from 'src/layout/BrokerFileTransfer/messages';
import { useAllowedFileEndings } from 'src/layout/BrokerFileTransfer/setup/useBrokerSetup';
import { useFilePick } from 'src/layout/BrokerFileTransfer/uploadState/useFilePick';

type ChooseFileWithoutBrokerProps = {
  baseComponentId: string;
  maxFileSize: number | null;
};

/** Stands in for ChooseFile where the app can't reach Broker, such as in Studio's preview: it can't send */
export function ChooseFileWithoutBroker({ baseComponentId, maxFileSize }: ChooseFileWithoutBrokerProps) {
  const language = useCurrentLanguage();
  const allowedFileEndings = useAllowedFileEndings(baseComponentId);
  const { file, pickError, pick, remove } = useFilePick(baseComponentId, allowedFileEndings);
  const problem = pickError ?? (file ? fileProblem(file, maxFileSize, language) : undefined);

  return (
    <div className={classes.container}>
      <FilePicker
        baseComponentId={baseComponentId}
        maxFileSize={maxFileSize}
        file={file}
        problem={problem}
        onPick={pick}
        onRemove={remove}
      />
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
