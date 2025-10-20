import React from 'react';

import cn from 'classnames';

import { Dropzone } from 'src/app-components/Dropzone/Dropzone';
import { getDescriptionId } from 'src/components/label/Label';
import { Lang } from 'src/features/language/Lang';
import { useIsMobileOrTablet } from 'src/hooks/useDeviceWidths';
import classes from 'src/layout/ImageUpload/ImageDropzone.module.css';
import type { IDropzoneProps } from 'src/app-components/Dropzone/Dropzone';

type ImageDropzoneProps = {
  baseComponentId: string;
  hasErrors: boolean;
  readOnly: boolean;
} & Pick<IDropzoneProps, 'onDrop'>;

export function ImageDropzone({ baseComponentId, hasErrors, readOnly, onDrop }: ImageDropzoneProps) {
  const [dragActive, setDragActive] = React.useState(false);
  const isMobile = useIsMobileOrTablet();
  const descriptionId = getDescriptionId(baseComponentId);
  const dragLabelId = `file-upload-drag-${baseComponentId}`;
  const formatLabelId = `file-upload-format-${baseComponentId}`;
  const ariaDescribedBy = [descriptionId, dragLabelId, formatLabelId].filter(Boolean).join(' ');

  return (
    <Dropzone
      id={baseComponentId}
      readOnly={readOnly}
      onDrop={onDrop}
      onDragActiveChange={setDragActive}
      hasValidationMessages={hasErrors}
      acceptedFiles={{ 'image/*': [] }}
      data-color='neutral'
      className={cn(classes.placeholder, { [classes.dragActive]: dragActive })}
      describedBy={ariaDescribedBy}
    >
      <div className={classes.dropZone}>
        <b id={dragLabelId}>
          {isMobile ? (
            <Lang id='form_filler.file_uploader_upload' />
          ) : (
            <>
              <Lang id='form_filler.file_uploader_drag' />
              <span className={classes.underLine}>
                {' '}
                <Lang id='form_filler.file_uploader_find' />
              </span>
            </>
          )}
        </b>
        <span id={formatLabelId}>
          <Lang id='image_upload_component.valid_file_types' />
        </span>
      </div>
    </Dropzone>
  );
}
