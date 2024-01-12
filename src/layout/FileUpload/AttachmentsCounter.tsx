import React from 'react';

import { useLanguage } from 'src/features/language/useLanguage';

interface IAttachmentsCounterProps {
  currentNumberOfAttachments: number;
  minNumberOfAttachments: number;
  maxNumberOfAttachments: number;
}
export const AttachmentsCounter = ({
  currentNumberOfAttachments,
  minNumberOfAttachments,
  maxNumberOfAttachments,
}: IAttachmentsCounterProps) => {
  const { langAsString } = useLanguage();
  return (
    <div>
      {`${langAsString('form_filler.file_uploader_number_of_files')} ${
        minNumberOfAttachments ? `${currentNumberOfAttachments}/${maxNumberOfAttachments}` : currentNumberOfAttachments
      }.`}
    </div>
  );
};
