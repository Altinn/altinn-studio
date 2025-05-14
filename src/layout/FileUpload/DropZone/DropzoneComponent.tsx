import React from 'react';
import DropZone from 'react-dropzone';
import type { FileRejection } from 'react-dropzone';

import { CloudUpIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import classes from 'src/layout/FileUpload/DropZone/DropzoneComponent.module.css';
import { mapExtensionToAcceptMime } from 'src/layout/FileUpload/DropZone/mapExtensionToAcceptMime';
import { AltinnPalette } from 'src/theme/altinnAppTheme';
import type { CompInternal } from 'src/layout/layout';

export interface IDropzoneComponentProps {
  id: string;
  isMobile: boolean;
  maxFileSizeInMB: number;
  readOnly: boolean;
  onClick: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  onDrop: (acceptedFiles: File[], rejectedFiles: FileRejection[]) => void;
  hasValidationMessages: boolean;
  hasCustomFileEndings?: boolean;
  validFileEndings?: CompInternal<'FileUpload'>['validFileEndings'];
  labelId?: string;
  descriptionId?: string;
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
  borderColor: AltinnPalette.blueMedium,
  borderStyle: 'dotted',
  cursor: 'pointer',
};
export const activeStyle = {
  borderStyle: 'solid',
};
export const validationErrorStyle = {
  borderStyle: 'dotted',
  borderColor: AltinnPalette.red,
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
  labelId,
  descriptionId,
}: IDropzoneComponentProps): React.JSX.Element {
  const maxSizeLabelId = `file-upload-max-size-${id}`;
  const { langAsString } = useLanguage();
  return (
    <div>
      <div
        className={classes.fileUploadTextBoldSmall}
        id={maxSizeLabelId}
      >
        <Lang
          id='form_filler.file_uploader_max_size_mb'
          params={[maxFileSizeInMB]}
        />
      </div>
      <DropZone
        onDrop={onDrop}
        maxSize={maxFileSizeInMB * bytesInOneMB} // mb to bytes
        disabled={readOnly}
        accept={
          hasCustomFileEndings && validFileEndings !== undefined
            ? mapExtensionToAcceptMime(validFileEndings)
            : undefined
        }
      >
        {({ getRootProps, getInputProps, isDragActive }) => {
          let styles = { ...baseStyle, ...fileUploadButtonStyle };
          styles = isDragActive ? { ...styles, ...activeStyle } : styles;
          styles = hasValidationMessages ? { ...styles, ...validationErrorStyle } : styles;

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
              className={`${classes.fileUpload}${hasValidationMessages ? classes.fileUploadInvalid : ''}`}
              aria-labelledby={labelId}
              aria-describedby={ariaDescribedBy}
            >
              <input
                {...getInputProps()}
                id={id}
              />
              <div className={classes.fileUploadWrapper}>
                <CloudUpIcon
                  className={classes.uploadIcon}
                  aria-hidden
                />
                <b id={dragLabelId}>
                  {isMobile ? (
                    <Lang id='form_filler.file_uploader_upload' />
                  ) : (
                    <>
                      <Lang id='form_filler.file_uploader_drag' />
                      <span className={cn(classes.blueUnderLine)}>
                        {' '}
                        <Lang id='form_filler.file_uploader_find' />
                      </span>
                    </>
                  )}
                </b>
                <span id={formatLabelId}>
                  <Lang id='form_filler.file_uploader_valid_file_format' />
                  {hasCustomFileEndings
                    ? ` ${validFileEndings}`
                    : ` ${langAsString('form_filler.file_upload_valid_file_format_all')}`}
                </span>
              </div>
            </div>
          );
        }}
      </DropZone>
    </div>
  );
}
