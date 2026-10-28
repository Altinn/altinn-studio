import React from 'react';

import { Button } from '@app/form-component';
import { TrashIcon } from '@navikt/aksel-icons';

import { Lang } from 'src/features/language/Lang';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { FileRow } from 'src/layout/BrokerFileTransfer/FileRow';
import { formatFileSize } from 'src/layout/BrokerFileTransfer/messages';

type ChosenFileProps = {
  file: File;
  onRemove: () => void;
};

export function ChosenFile({ file, onRemove }: ChosenFileProps) {
  const language = useCurrentLanguage();
  return (
    <FileRow
      name={file.name}
      details={formatFileSize(file.size, language)}
    >
      <Button
        variant='tertiary'
        color='danger'
        onClick={onRemove}
      >
        <Lang id='broker_file_transfer.remove_file' />
        <TrashIcon
          fontSize='1rem'
          aria-hidden
        />
      </Button>
    </FileRow>
  );
}
