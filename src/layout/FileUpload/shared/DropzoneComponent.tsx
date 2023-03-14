import React from 'react';
import DropZone from 'react-dropzone';
import type { FileRejection } from 'react-dropzone';

import { getLanguageFromKey } from 'src/language/sharedLanguage';
import { mapExtensionToAcceptMime } from 'src/layout/FileUpload/shared/mapExtensionToAcceptMime';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import type { ILayoutCompFileUpload } from 'src/layout/FileUpload/types';
import type { ITextResourceBindings } from 'src/types';

export interface IDropzoneComponentProps {
  id: string;
  isMobile: boolean;
  language: any;
  maxFileSizeInMB: number;
  readOnly: boolean;
  onClick: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  onDrop: (acceptedFiles: File[], rejectedFiles: FileRejection[]) => void;
  hasValidationMessages: boolean;
  hasCustomFileEndings?: boolean;
  validFileEndings?: ILayoutCompFileUpload['validFileEndings'];
  textResourceBindings?: ITextResourceBindings;
}

export const bytesInOneMB = 1048576;

export const baseStyle = {
  width: 'auto',
  height: '9.75rem',
  borderWidth: '2px',
  borderColor: AltinnAppTheme.altinnPalette.primary.blueMedium,
  borderStyle: 'dotted',
  cursor: 'pointer',
};
export const activeStyle = {
  borderStyle: 'solid',
};
export const rejectStyle = {
  borderStyle: 'solid',
  borderColor: AltinnAppTheme.altinnPalette.primary.red,
};
export const validationErrorStyle = {
  borderStyle: 'dotted',
  borderColor: AltinnAppTheme.altinnPalette.primary.red,
};

export function DropzoneComponent({
  id,
  isMobile,
  language,
  maxFileSizeInMB,
  readOnly,
  onClick,
  onDrop,
  hasValidationMessages,
  hasCustomFileEndings,
  validFileEndings,
  textResourceBindings,
}: IDropzoneComponentProps): JSX.Element {
  const maxSizeLabelId = `file-upload-max-size-${id}`;

  return (
    <div>
      <div
        className='file-upload-text-bold-small'
        id={maxSizeLabelId}
      >
        {`${getLanguageFromKey('form_filler.file_uploader_max_size', language)} ${maxFileSizeInMB} ${getLanguageFromKey(
          'form_filler.file_uploader_mb',
          language,
        )}`}
      </div>
      <DropZone
        onDrop={onDrop}
        maxSize={maxFileSizeInMB * bytesInOneMB} // mb to bytes
        disabled={readOnly}
        accept={
          hasCustomFileEndings && validFileEndings !== undefined
            ? mapExtensionToAcceptMime({ extensionList: validFileEndings })
            : undefined
        }
      >
        {({ getRootProps, getInputProps, isDragActive, isDragReject }) => {
          let styles = { ...baseStyle };
          styles = isDragActive ? { ...styles, ...activeStyle } : styles;
          styles = isDragReject ? { ...styles, ...rejectStyle } : styles;
          styles = hasValidationMessages ? { ...styles, ...validationErrorStyle } : styles;

          const labelId = `label-${id}`;
          const descriptionId = textResourceBindings?.description ? `description-${id}` : undefined;
          const dragLabelId = `file-upload-drag-${id}`;
          const formatLabelId = `file-upload-format-${id}`;
          const ariaDescribedBy = descriptionId
            ? `${descriptionId} ${maxSizeLabelId} ${dragLabelId} ${formatLabelId}`
            : `${maxSizeLabelId} ${dragLabelId} ${formatLabelId}`;

          return (
            <div
              {...getRootProps({
                onClick,
              })}
              style={styles}
              id={`altinn-drop-zone-${id}`}
              data-testid={`altinn-drop-zone-${id}`}
              className={`file-upload${hasValidationMessages ? ' file-upload-invalid' : ''}`}
              role='button'
              aria-labelledby={labelId}
              aria-describedby={ariaDescribedBy}
            >
              <input
                {...getInputProps()}
                id={id}
              />
              <div>
                <div
                  className='col text-center icon'
                  style={{ marginTop: '2.1875rem' }}
                >
                  <i className='ai ai-upload' />
                </div>
                <div className='col text-center'>
                  <span
                    id={dragLabelId}
                    className='file-upload-text-bold'
                  >
                    {isMobile ? (
                      <>{getLanguageFromKey('form_filler.file_uploader_upload', language)}</>
                    ) : (
                      <>
                        {getLanguageFromKey('form_filler.file_uploader_drag', language)}
                        <span className='file-upload-text-bold blue-underline'>
                          {` ${getLanguageFromKey('form_filler.file_uploader_find', language)}`}
                        </span>
                      </>
                    )}
                  </span>
                </div>
                <div className='col text-center'>
                  <span
                    id={formatLabelId}
                    className='file-upload-text'
                  >
                    {getLanguageFromKey('form_filler.file_uploader_valid_file_format', language)}
                    {hasCustomFileEndings
                      ? ` ${validFileEndings}`
                      : ` ${getLanguageFromKey('form_filler.file_upload_valid_file_format_all', language)}`}
                  </span>
                </div>
              </div>
            </div>
          );
        }}
      </DropZone>
    </div>
  );
}
