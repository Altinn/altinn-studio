import React from 'react';
import DropZone from 'react-dropzone';
import type { FileRejection } from 'react-dropzone';

import { useLanguage } from 'src/hooks/useLanguage';
import classes from 'src/layout/FileUpload/shared/DropzoneComponent.module.css';
import { mapExtensionToAcceptMime } from 'src/layout/FileUpload/shared/mapExtensionToAcceptMime';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import type { ILayoutCompFileUpload } from 'src/layout/FileUpload/types';
import type { ITextResourceBindings } from 'src/types';

export interface IDropzoneComponentProps {
  id: string;
  isMobile: boolean;
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

const fileUploadButtonStyle = {
  background: 'transparent',
  width: '100%',
};

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
  const { lang, langAsString } = useLanguage();
  return (
    <div>
      <div
        className={classes.fileUploadTextBoldSmall}
        id={maxSizeLabelId}
      >
        {`${langAsString('form_filler.file_uploader_max_size')} ${maxFileSizeInMB} ${langAsString(
          'form_filler.file_uploader_mb',
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
          let styles = { ...baseStyle, ...fileUploadButtonStyle };
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
            <button
              {...getRootProps({
                onClick,
              })}
              style={styles}
              id={`altinn-drop-zone-${id}`}
              data-testid={`altinn-drop-zone-${id}`}
              className={`${classes.fileUpload}${hasValidationMessages ? classes.fileUploadInvalid : ''}`}
              aria-labelledby={labelId}
              aria-describedby={ariaDescribedBy}
            >
              <input
                {...getInputProps()}
                id={id}
              />
              <div className={`container ${classes.fileUploadWrapper}`}>
                <div className='col text-center icon'>
                  <i className={`ai ai-upload ${classes.uploadIcon}`} />
                </div>
                <div className='col text-center'>
                  <span
                    id={dragLabelId}
                    className={`${classes.fileUploadTextBold}`}
                  >
                    {isMobile ? (
                      lang('form_filler.file_uploader_upload')
                    ) : (
                      <>
                        {langAsString('form_filler.file_uploader_drag')}
                        <span className={`${classes.fileUploadTextBold} ${classes.blueUnderLine}`}>
                          {' '}
                          {langAsString('form_filler.file_uploader_find')}
                        </span>
                      </>
                    )}
                  </span>
                </div>
                <div className='col text-center'>
                  <span
                    id={formatLabelId}
                    className={classes.fileUploadText}
                  >
                    {langAsString('form_filler.file_uploader_valid_file_format')}
                    {hasCustomFileEndings
                      ? ` ${validFileEndings}`
                      : ` ${langAsString('form_filler.file_upload_valid_file_format_all')}`}
                  </span>
                </div>
              </div>
            </button>
          );
        }}
      </DropZone>
    </div>
  );
}
