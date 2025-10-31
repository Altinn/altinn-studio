import React from 'react';
import { useDropzone } from 'react-dropzone';
import type { HTMLAttributes } from 'react';
import type { FileRejection } from 'react-dropzone';

import cn from 'classnames';

import classes from 'src/app-components/Dropzone/Dropzone.module.css';
import { RefsUtils } from 'src/utils/refs/mergeRefs';

type MaxFileSize = {
  sizeInMB: number;
  text: string;
};

export type IDropzoneProps = {
  id: string;
  maxFileSize?: MaxFileSize;
  readOnly: boolean;
  onClick?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  onDrop: (acceptedFiles: File[], rejectedFiles: FileRejection[]) => void;
  onDragActiveChange?: (isDragActive: boolean) => void;
  hasValidationMessages: boolean;
  acceptedFiles?: { [key: string]: string[] };
  labelId?: string;
  describedBy?: string;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
} & Pick<HTMLAttributes<HTMLDivElement>, 'children'>;

const bytesInOneMB = 1048576;

export function Dropzone({
  id,
  maxFileSize,
  readOnly,
  onClick,
  onDrop,
  onDragActiveChange,
  hasValidationMessages,
  acceptedFiles,
  labelId,
  children,
  className,
  describedBy,
  inputRef,
  ...rest
}: IDropzoneProps): React.JSX.Element {
  const maxSizeLabelId = `file-upload-max-size-${id}`;
  const describedby =
    [describedBy, maxFileSize?.sizeInMB ? maxSizeLabelId : undefined].filter(Boolean).join(' ') || undefined;

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: maxFileSize && maxFileSize.sizeInMB * bytesInOneMB,
    disabled: readOnly,
    accept: acceptedFiles,
  });

  const inputProps = getInputProps();
  const dropzoneRef = (inputProps as { ref?: React.Ref<HTMLInputElement> }).ref;
  const combinedRef = React.useMemo(() => RefsUtils.merge(dropzoneRef, inputRef), [dropzoneRef, inputRef]);

  // set drag active state in parent component if callback is provided
  React.useEffect(() => {
    if (onDragActiveChange) {
      onDragActiveChange(isDragActive);
    }
  }, [isDragActive, onDragActiveChange]);

  return (
    <div>
      {maxFileSize && (
        <div
          className={classes.fileUploadTextBoldSmall}
          id={maxSizeLabelId}
        >
          {maxFileSize.text}
        </div>
      )}

      <div
        {...getRootProps({
          onClick,
        })}
        id={`altinn-drop-zone-${id}`}
        {...rest}
        className={cn(
          classes.fileUpload,
          { [classes.active]: isDragActive },
          { [classes.validationError]: hasValidationMessages },
          { [classes.fileUploadInvalid]: hasValidationMessages },
          className,
        )}
        aria-labelledby={labelId}
        aria-describedby={describedby}
      >
        <input
          {...inputProps}
          ref={combinedRef}
          id={id}
        />
        {children}
      </div>
    </div>
  );
}
