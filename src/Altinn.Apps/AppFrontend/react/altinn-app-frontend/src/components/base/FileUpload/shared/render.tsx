import * as React from 'react';
import { getFileEnding, removeFileEnding } from "src/utils/attachment";
import { getLanguageFromKey } from 'altinn-shared/utils';

export const renderFileName = (filename: string): JSX.Element => {
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
        {removeFileEnding(filename)}
      </div>
      <div>
        {getFileEnding(filename)}
      </div>
    </div>
  );
};

export const renderAttachmentsCounter = (language: any, currentNumberOfAttachments: number, minNumberOfAttachments: number, maxNumberOfAttachments: number): JSX.Element => {
  return (
    <div
      className='file-upload-text-bold-small'
      id='number-of-attachments'
    >
      {
        `${getLanguageFromKey('form_filler.file_uploader_number_of_files', language)} ${minNumberOfAttachments ? `${currentNumberOfAttachments}/${maxNumberOfAttachments}`
          : currentNumberOfAttachments}.`
      }
    </div>
  );
};

export const renderFileUploadContent = (id: string, isMobile: boolean, language: any, hasCustomFileEndings?: boolean, validFileEndings?: string): JSX.Element => {
  return (
    <div className='container'>
      <div className='col text-center icon' style={{ marginTop: '3.5rem' }}>
        <i className='ai ai-upload' />
      </div>
      <div className='col text-center'>
        <label
          htmlFor={id}
          className='file-upload-text-bold'
          id='file-upload-description'
        >
          {isMobile ? (
            <>
              {getLanguageFromKey(
                'form_filler.file_uploader_upload',
                language,
              )}
            </>
          ) : (
            <>
              {getLanguageFromKey(
                'form_filler.file_uploader_drag',
                language,
              )}
              <span className='file-upload-text-bold blue-underline'>
                {` ${getLanguageFromKey(
                  'form_filler.file_uploader_find',
                  language,
                )}`}
              </span>
            </>
          )}
        </label>
      </div>
      <div className='col text-center'>
        <label
          htmlFor={id}
          className='file-upload-text'
          id='file-format-description'
        >
          {getLanguageFromKey(
            'form_filler.file_uploader_valid_file_format',
            language,
          )}
          {hasCustomFileEndings
            ? ` ${validFileEndings}`
            : ` ${getLanguageFromKey(
                'form_filler.file_upload_valid_file_format_all',
                language,
              )}`}
        </label>
      </div>
    </div>
  );
};
