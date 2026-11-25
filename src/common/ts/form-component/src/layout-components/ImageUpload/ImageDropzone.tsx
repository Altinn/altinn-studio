import { useState } from 'react';
import type { RefObject } from 'react';

import cn from 'classnames';

import { Dropzone } from '../../app-components/Dropzone';
import { useIsMobileOrTablet } from '../../app-components/hooks';
import { useTranslation } from '../../LanguageTranslatorProvider';
import { getDescriptionId } from '../utils/labelIds';
import classes from './ImageDropzone.module.css';
import type { IDropzoneProps } from '../../app-components/Dropzone';

type ImageDropzoneProps = {
  componentId: string;
  hasErrors: boolean;
  readOnly: boolean;
  dropzoneInputRef?: RefObject<HTMLInputElement | null>;
} & Pick<IDropzoneProps, 'onDrop'>;

export function ImageDropzone({
  componentId,
  hasErrors,
  readOnly,
  onDrop,
  dropzoneInputRef,
}: ImageDropzoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const { lang } = useTranslation();
  const isMobile = useIsMobileOrTablet();
  const descriptionId = getDescriptionId(componentId);
  const dragLabelId = `file-upload-drag-${componentId}`;
  const formatLabelId = `file-upload-format-${componentId}`;
  const ariaDescribedBy = [descriptionId, dragLabelId, formatLabelId].filter(Boolean).join(' ');

  return (
    <Dropzone
      id={componentId}
      readOnly={readOnly}
      onDrop={onDrop}
      onDragActiveChange={setDragActive}
      hasValidationMessages={hasErrors}
      acceptedFiles={{ 'image/*': [] }}
      data-color='neutral'
      className={cn(classes.placeholder, { [classes.dragActive]: dragActive })}
      describedBy={ariaDescribedBy}
      inputRef={dropzoneInputRef}
    >
      <div className={classes.dropZone}>
        <b id={dragLabelId}>
          {isMobile ? (
            <span className={classes.underLine}>{lang('form_filler.file_uploader_upload')}</span>
          ) : (
            <>
              {lang('form_filler.file_uploader_drag')}
              <span className={classes.underLine}> {lang('form_filler.file_uploader_find')}</span>
            </>
          )}
        </b>
        <span id={formatLabelId}>{lang('image_upload_component.valid_file_types')}</span>
      </div>
    </Dropzone>
  );
}
