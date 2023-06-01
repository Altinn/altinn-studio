import React from 'react';
import { FieldSet, RadioGroup, RadioGroupVariant, TextField } from '@digdir/design-system-react';
import classes from './FileUploadComponent.module.css';
import { useText } from '../../../../hooks';
import { IGenericEditComponent } from '../../componentConfig';
import { ComponentType } from 'app-shared/types/ComponentType';
import type {
  FormFileUploaderComponent,
  FormFileUploaderWithTagComponent,
} from '../../../../types/FormComponent';

export const FileUploadComponent = ({
  component,
  handleComponentChange,
  layoutName,
}: IGenericEditComponent) => {
  const t = useText();

  const fileUploaderComponent = component as FormFileUploaderComponent;

  const handleDisplayModeChange = (displayMode: string) =>
    handleComponentChange({ ...component, displayMode });

  const handleHasCustomFileEndingsChange = (value: string) => {
    const componentCopy = { ...component } as
      | FormFileUploaderComponent
      | FormFileUploaderWithTagComponent;
    componentCopy.hasCustomFileEndings = value === 'true';
    if (!componentCopy.hasCustomFileEndings) {
      componentCopy.validFileEndings = undefined;
    }
    handleComponentChange(componentCopy);
  };

  const handleValidFileEndingsChange = (event: any) =>
    handleComponentChange({ ...component, validFileEndings: event.target.value } as
      | FormFileUploaderComponent
      | FormFileUploaderWithTagComponent);

  const handleNumberOfAttachmentsChange = (type: string) => (event: any) => {
    const componentCopy = { ...component } as
      | FormFileUploaderComponent
      | FormFileUploaderWithTagComponent;
    const value = parseInt(event.target.value, 10);
    if (type === 'max') {
      componentCopy.maxNumberOfAttachments = value >= 1 ? value : 1;
    } else {
      componentCopy.minNumberOfAttachments = value >= 0 ? value : 0;
      componentCopy.required = value > 0;
    }
    handleComponentChange(componentCopy);
  };

  const handleMaxFileSizeInMBChange = (event: any) => {
    const componentCopy = { ...component } as
      | FormFileUploaderComponent
      | FormFileUploaderWithTagComponent;
    const value = parseInt(event.target.value, 10);
    componentCopy.maxFileSizeInMB = value >= 0 ? value : 0;
    handleComponentChange(componentCopy);
  };

  return (
    <FieldSet className={classes.fieldset}>
      <RadioGroup
        items={[
          {
            label: t('ux_editor.modal_properties_valid_file_endings_all'),
            value: 'false',
          },
          {
            label: t('ux_editor.modal_properties_valid_file_endings_custom'),
            value: 'true',
          },
        ]}
        name={`${component.id}-valid-file-endings`}
        onChange={handleHasCustomFileEndingsChange}
        value={fileUploaderComponent.hasCustomFileEndings ? 'true' : 'false'}
        variant={RadioGroupVariant.Horizontal}
      />

      {fileUploaderComponent.hasCustomFileEndings && (
        <TextField
          id='modal-properties-valid-file-endings'
          label={t('ux_editor.modal_properties_valid_file_endings_helper')}
          onChange={handleValidFileEndingsChange}
          value={fileUploaderComponent.validFileEndings}
        />
      )}
      {component.type === ComponentType.FileUpload && (
        <RadioGroup
          items={[
            {
              label: t('ux_editor.modal_properties_file_upload_simple'),
              value: 'simple',
            },
            {
              label: t('ux_editor.modal_properties_file_upload_list'),
              value: 'list',
            },
          ]}
          name={`${component.id}-display-mode`}
          onChange={handleDisplayModeChange}
          value={fileUploaderComponent.displayMode}
          variant={RadioGroupVariant.Horizontal}
        />
      )}
      <div>
        <TextField
          formatting={{ number: {} }}
          id={`modal-properties-minimum-files-input-${fileUploaderComponent.id}`}
          label={t('ux_editor.modal_properties_minimum_files')}
          onChange={handleNumberOfAttachmentsChange('min')}
          value={(fileUploaderComponent.minNumberOfAttachments || 0).toString()}
        />
      </div>
      <div>
        <TextField
          formatting={{ number: {} }}
          id={`modal-properties-maximum-files-input-${fileUploaderComponent.id}`}
          label={t('ux_editor.modal_properties_maximum_files')}
          onChange={handleNumberOfAttachmentsChange('max')}
          value={(fileUploaderComponent.maxNumberOfAttachments || 1).toString()}
        />
      </div>
      <div>
        <TextField
          formatting={{ number: {} }}
          id='modal-properties-file-size'
          label={`${t('ux_editor.modal_properties_maximum_file_size')} (${t(
            'ux_editor.modal_properties_maximum_file_size_helper'
          )})`}
          onChange={handleMaxFileSizeInMBChange}
          value={(fileUploaderComponent.maxFileSizeInMB || 0).toString()}
        />
      </div>
    </FieldSet>
  );
};
