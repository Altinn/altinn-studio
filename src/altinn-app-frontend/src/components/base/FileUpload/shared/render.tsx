import * as React from 'react';

import { getFileEnding, removeFileEnding } from 'src/utils/attachment';

import { getLanguageFromKey } from 'altinn-shared/utils';

export const FileName = ({ children }: { children: string | undefined }) => {
  return (
    <div
      style={{
        display: 'flex',
      }}
    >
      <div
        style={{
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
      >
        {removeFileEnding(children)}
      </div>
      <div>{getFileEnding(children)}</div>
    </div>
  );
};

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
}: IAttachmentsCounterProps) => {
  return (
    <div
      className='file-upload-text-bold-small'
      id='number-of-attachments'
    >
      {`${getLanguageFromKey(
        'form_filler.file_uploader_number_of_files',
        language,
      )} ${
        minNumberOfAttachments
          ? `${currentNumberOfAttachments}/${maxNumberOfAttachments}`
          : currentNumberOfAttachments
      }.`}
    </div>
  );
};
