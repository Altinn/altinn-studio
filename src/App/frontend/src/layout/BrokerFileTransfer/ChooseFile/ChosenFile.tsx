import React from 'react';

import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { FileBox } from 'src/layout/BrokerFileTransfer/FileBox';
import { formatFileSize } from 'src/layout/BrokerFileTransfer/formatting';
import { RemoveFileButton } from 'src/layout/BrokerFileTransfer/RemoveFileButton';

type ChosenFileProps = {
  file: File;
  onRemove: () => void;
};

/** Shows the chosen file with its size and a button to remove it */
export function ChosenFile({ file, onRemove }: ChosenFileProps) {
  const language = useCurrentLanguage();
  return (
    <FileBox
      name={file.name}
      details={formatFileSize(file.size, language)}
    >
      <RemoveFileButton onRemove={onRemove} />
    </FileBox>
  );
}
