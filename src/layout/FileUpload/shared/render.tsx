import React from 'react';

import { getLanguageFromKey } from 'src/language/sharedLanguage';

interface IAttachmentsCounterProps {
  language: any;
  currentNumberOfAttachments: number;
  minNumberOfAttachments: number;
  maxNumberOfAttachments: number;
}
export const AttachmentsCounter = ({
  language,
  currentNumberOfAttachments,
  minNumberOfAttachments,
  maxNumberOfAttachments,
}: IAttachmentsCounterProps) => (
  <div className='file-upload-text-bold-small'>
    {`${getLanguageFromKey('form_filler.file_uploader_number_of_files', language)} ${
      minNumberOfAttachments ? `${currentNumberOfAttachments}/${maxNumberOfAttachments}` : currentNumberOfAttachments
    }.`}
  </div>
);
