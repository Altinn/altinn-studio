import * as React from 'react';
import { getLanguageFromKey } from 'altinn-shared/utils';
import DropZone, { FileRejection } from 'react-dropzone';
import { AltinnAppTheme } from 'altinn-shared/theme';
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
  validFileEndings?: string;
  textResourceBindings: ITextResourceBindings;
}

export const bytesInOneMB = 1048576;

export const baseStyle = {
  width: 'auto',
  height: '15.6rem',
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
  return (
    <div>
      <div
        className='file-upload-text-bold-small'
        id='max-size'
      >
        {
          `${getLanguageFromKey('form_filler.file_uploader_max_size', language)
          } ${maxFileSizeInMB} ${getLanguageFromKey('form_filler.file_uploader_mb', language)}`
        }
      </div>
      <DropZone
        onDrop={onDrop}
        maxSize={maxFileSizeInMB * bytesInOneMB} // mb to bytes
        disabled={readOnly}
        accept={(hasCustomFileEndings) ? validFileEndings : null}
      >
        {({
          getRootProps, getInputProps, isDragActive, isDragReject,
        }) => {
          let styles = { ...baseStyle };
          styles = isDragActive ? { ...styles, ...activeStyle } : styles;
          styles = isDragReject ? { ...styles, ...rejectStyle } : styles;
          styles = (hasValidationMessages) ? { ...styles, ...validationErrorStyle } : styles;

          const ariaDescribedByDefault = 'file-upload-description file-format-description max-size number-of-attachments';
          const ariaDescribedByDescription = textResourceBindings?.description ? `description-${id}` : undefined;
          const ariaDescribedBy = ariaDescribedByDescription ? `${ariaDescribedByDefault} ${ariaDescribedByDescription}` : ariaDescribedByDefault;

          return (
            <div
              {...getRootProps({
                onClick: onClick,
              })}
              style={styles}
              id={`altinn-drop-zone-${id}`}
              data-testid={`altinn-drop-zone-${id}`}
              className={`file-upload${hasValidationMessages ? ' file-upload-invalid' : ''}`}
              aria-describedby={ariaDescribedBy}
              aria-labelledby={`label-${id}`}
              role='button'
            >
              <input
                {...getInputProps()}
                id={id}
              />
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
            </div>
          );
        }}
      </DropZone>
    </div>
  );
};
