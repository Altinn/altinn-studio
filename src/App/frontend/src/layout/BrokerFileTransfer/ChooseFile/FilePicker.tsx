import React from 'react';
import type { FileRejection } from 'react-dropzone';

import { ValidationMessage } from '@digdir/designsystemet-react';

import { Lang } from 'src/features/language/Lang';
import { ChosenFile } from 'src/layout/BrokerFileTransfer/ChooseFile/ChosenFile';
import { FileDropzone } from 'src/layout/BrokerFileTransfer/ChooseFile/FileDropzone';
import type { Message } from 'src/layout/BrokerFileTransfer/messages';

type FilePickerProps = {
  baseComponentId: string;
  maxFileSize: number | null;
  file: File | null;
  problem: Message | undefined;
  onPick: (accepted: File[], rejected: FileRejection[]) => void;
  onRemove: () => void;
};

/** The drop zone, or the chosen file once there is one, with any problem with the file below */
export function FilePicker({ baseComponentId, maxFileSize, file, problem, onPick, onRemove }: FilePickerProps) {
  return (
    <>
      {file ? (
        <ChosenFile
          file={file}
          onRemove={onRemove}
        />
      ) : (
        <FileDropzone
          baseComponentId={baseComponentId}
          maxFileSize={maxFileSize}
          hasError={!!problem}
          onDrop={onPick}
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
    </>
  );
}
