import React from 'react';

import { useLanguage } from 'src/hooks/useLanguage';

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
    <div className='file-upload-text-bold-small'>
      {`${langAsString('form_filler.file_uploader_number_of_files')} ${
        minNumberOfAttachments ? `${currentNumberOfAttachments}/${maxNumberOfAttachments}` : currentNumberOfAttachments
      }.`}
    </div>
  );
};
