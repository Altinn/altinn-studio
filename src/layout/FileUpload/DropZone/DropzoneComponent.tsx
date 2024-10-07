import React from 'react';
import DropZone from 'react-dropzone';
import type { FileRejection } from 'react-dropzone';

import { CloudUpIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

import { getDescriptionId, getLabelId } from 'src/components/label/Label';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import classes from 'src/layout/FileUpload/DropZone/DropzoneComponent.module.css';
import { mapExtensionToAcceptMime } from 'src/layout/FileUpload/DropZone/mapExtensionToAcceptMime';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import type { CompInternal, ITextResourceBindings } from 'src/layout/layout';

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
  textResourceBindings?: ITextResourceBindings<'FileUpload' | 'FileUploadWithTag'>;
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
}: IDropzoneComponentProps): React.JSX.Element {
  const maxSizeLabelId = `file-upload-max-size-${id}`;
  const { langAsString } = useLanguage();
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

          const labelId = getLabelId(id);
          const descriptionId = textResourceBindings?.description ? getDescriptionId(id) : undefined;
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
              <div className={classes.fileUploadWrapper}>
                <CloudUpIcon
                  className={classes.uploadIcon}
                  aria-hidden
                />
                <span
                  id={dragLabelId}
                  className={classes.fileUploadTextBold}
                >
                  {isMobile ? (
                    <Lang id='form_filler.file_uploader_upload' />
                  ) : (
                    <>
                      <Lang id={'form_filler.file_uploader_drag'} />
                      <span className={cn(classes.fileUploadTextBold, classes.blueUnderLine)}>
                        {' '}
                        <Lang id='form_filler.file_uploader_find' />
                      </span>
                    </>
                  )}
                </span>
                <span
                  id={formatLabelId}
                  className={classes.fileUploadText}
                >
                  <Lang id='form_filler.file_uploader_valid_file_format' />
                  {hasCustomFileEndings
                    ? ` ${validFileEndings}`
                    : ` ${langAsString('form_filler.file_upload_valid_file_format_all')}`}
                </span>
              </div>
            </button>
          );
        }}
      </DropZone>
    </div>
  );
}
