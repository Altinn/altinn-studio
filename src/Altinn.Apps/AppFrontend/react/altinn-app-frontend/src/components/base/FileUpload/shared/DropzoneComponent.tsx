import * as React from 'react';
import { getLanguageFromKey } from 'altinn-shared/utils';
import DropZone, { FileRejection } from 'react-dropzone';
import { AltinnAppTheme } from 'altinn-shared/theme';

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

export function DropzoneComponent(props: IDropzoneComponentProps): JSX.Element {
  return (
    <div>
      <div
        className='file-upload-text-bold-small'
        id='max-size'
      >
        {
          `${getLanguageFromKey('form_filler.file_uploader_max_size', props.language)
          } ${props.maxFileSizeInMB} ${getLanguageFromKey('form_filler.file_uploader_mb', props.language)}`
        }
      </div>
      <DropZone
        onDrop={props.onDrop}
        maxSize={props.maxFileSizeInMB * bytesInOneMB} // mb to bytes
        disabled={props.readOnly}
        accept={(props.hasCustomFileEndings) ? props.validFileEndings : null}
      >
        {({
          getRootProps, getInputProps, isDragActive, isDragReject,
        }) => {
          let styles = { ...baseStyle };
          styles = isDragActive ? { ...styles, ...activeStyle } : styles;
          styles = isDragReject ? { ...styles, ...rejectStyle } : styles;
          styles = (props.hasValidationMessages) ? { ...styles, ...validationErrorStyle } : styles;

          return (
            <div
              {...getRootProps({
                onClick: props.onClick,
              })}
              style={styles}
              id={`altinn-drop-zone-${props.id}`}
              className={`file-upload${props.hasValidationMessages ? ' file-upload-invalid' : ''}`}
              aria-describedby={`description-${props.id} file-upload-description file-format-description max-size number-of-attachments`}
              aria-labelledby={`label-${props.id}`}
              role='button'
            >
              <input
                {...getInputProps()}
                id={props.id}
              />
              <div className='container'>
                <div className='col text-center icon' style={{ marginTop: '3.5rem' }}>
                  <i className='ai ai-upload' />
                </div>
                <div className='col text-center'>
                  <label
                    htmlFor={props.id}
                    className='file-upload-text-bold'
                    id='file-upload-description'
                  >
                    {props.isMobile ? (
                      <>
                        {getLanguageFromKey(
                          'form_filler.file_uploader_upload',
                          props.language,
                        )}
                      </>
                    ) : (
                      <>
                        {getLanguageFromKey(
                          'form_filler.file_uploader_drag',
                          props.language,
                        )}
                        <span className='file-upload-text-bold blue-underline'>
                          {` ${getLanguageFromKey(
                            'form_filler.file_uploader_find',
                            props.language,
                          )}`}
                        </span>
                      </>
                    )}
                  </label>
                </div>
                <div className='col text-center'>
                  <label
                    htmlFor={props.id}
                    className='file-upload-text'
                    id='file-format-description'
                  >
                    {getLanguageFromKey(
                      'form_filler.file_uploader_valid_file_format',
                      props.language,
                    )}
                    {props.hasCustomFileEndings
                      ? ` ${props.validFileEndings}`
                      : ` ${getLanguageFromKey(
                          'form_filler.file_upload_valid_file_format_all',
                          props.language,
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
