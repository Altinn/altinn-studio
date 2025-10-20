import React, { useId, useRef } from 'react';

import { Button, Input, Label } from '@digdir/designsystemet-react';
import { ArrowUndoIcon, TrashIcon, UploadIcon } from '@navikt/aksel-icons';

import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import classes from 'src/layout/ImageUpload/ImageControllers.module.css';
import { isAnimationFile, logToNormalZoom, normalToLogZoom } from 'src/layout/ImageUpload/imageUploadUtils';
import type { UploadedAttachment } from 'src/features/attachments';

type ImageControllersProps = {
  imageType: string;
  readOnly: boolean;
  zoom: number;
  zoomLimits: { minZoom: number; maxZoom: number };
  storedImage?: UploadedAttachment;
  onSave: () => void;
  onDelete: () => void;
  onCancel: () => void;
  updateZoom: (zoom: number) => void;
  onFileUploaded: (file: File) => void;
  onReset: () => void;
};

export function ImageControllers({
  imageType,
  readOnly,
  zoom,
  zoomLimits: { minZoom, maxZoom },
  storedImage,
  onSave,
  onDelete,
  onCancel,
  updateZoom,
  onFileUploaded,
  onReset,
}: ImageControllersProps) {
  const { langAsString } = useLanguage();
  const uid = useId();
  const zoomId = `${uid}-zoom`;
  const inputId = `${uid}-image-upload`;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSliderZoom = (e: React.ChangeEvent<HTMLInputElement>) => {
    const logarithmicZoomValue = normalToLogZoom({
      value: Number.parseFloat(e.target.value),
      minZoom,
      maxZoom,
    });

    updateZoom(logarithmicZoomValue);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUploaded(file);
    }
  };

  if (storedImage) {
    return (
      <Button
        data-size='sm'
        variant='secondary'
        data-color='danger'
        onClick={onDelete}
        disabled={!storedImage.uploaded || storedImage.deleting || readOnly}
      >
        <TrashIcon />
        <Lang id='image_upload_component.button_delete' />
      </Button>
    );
  }

  const handleFileSelectKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef?.current?.click();
    }
  };

  return (
    <div className={classes.controlsContainer}>
      {isAnimationFile(imageType) && (
        <span>
          <Lang id='image_upload_component.animated_warning' />
        </span>
      )}
      <div>
        <Label htmlFor={zoomId}>
          <Lang id='image_upload_component.slider_zoom' />
        </Label>
        <div className={classes.zoomControls}>
          <input
            id={zoomId}
            type='range'
            min='0'
            max='100'
            step='0.5'
            value={logToNormalZoom({ value: zoom, minZoom, maxZoom })}
            onChange={handleSliderZoom}
            className={classes.zoomSlider}
          />
          <Button
            onClick={onReset}
            variant='tertiary'
            icon={true}
          >
            <ArrowUndoIcon
              title={langAsString('image_upload_component.reset')}
              className={classes.resetButton}
            />
          </Button>
        </div>
      </div>
      <div className={classes.actionButtons}>
        <Button
          onClick={onSave}
          data-size='sm'
          data-color='accent'
        >
          <Lang id='image_upload_component.button_save' />
        </Button>
        <Input
          id={inputId}
          ref={fileInputRef}
          type='file'
          accept='image/*'
          onChange={handleImageChange}
          hidden
        />

        <Button
          asChild
          data-size='sm'
          variant='secondary'
          data-color='accent'
          tabIndex={0}
          onKeyDown={(e) => handleFileSelectKeyDown(e)}
        >
          <Label htmlFor={inputId}>
            <UploadIcon />
            <Lang id='image_upload_component.button_change' />
          </Label>
        </Button>
        <Button
          data-size='sm'
          variant='tertiary'
          onClick={onCancel}
          data-color='accent'
        >
          <Lang id='general.cancel' />
        </Button>
      </div>
    </div>
  );
}
