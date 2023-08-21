import React from 'react';
import { Fieldset, LegacyRadioGroup, TextField } from '@digdir/design-system-react';
import classes from './FileUploadComponent.module.css';
import { useText } from '../../../../hooks';
import { IGenericEditComponent } from '../../componentConfig';
import { ComponentType } from 'app-shared/types/ComponentType';
import type {
  FormFileUploaderComponent,
  FormFileUploaderWithTagComponent,
} from '../../../../types/FormComponent';
import { FormField } from '../../../FormField';

export const FileUploadComponent = ({
  component,
  handleComponentChange,
  layoutName,
}: IGenericEditComponent) => {
  const t = useText();

  const fileUploaderComponent = component as FormFileUploaderComponent;

  const handleDisplayModeChange = (displayMode: string) =>
    handleComponentChange({ ...component, displayMode });

  const handleHasCustomFileEndingsChange = (hasCustomFileEndings: string) => {
    const componentCopy = { ...component } as
      | FormFileUploaderComponent
      | FormFileUploaderWithTagComponent;
    componentCopy.hasCustomFileEndings = hasCustomFileEndings === 'true';
    if (!componentCopy.hasCustomFileEndings) {
      componentCopy.validFileEndings = undefined;
    }
    handleComponentChange(componentCopy);
  };

  const handleValidFileEndingsChange = (validFileEndings: string) =>
    handleComponentChange({ ...component, validFileEndings } as
      | FormFileUploaderComponent
      | FormFileUploaderWithTagComponent);

  const handleNumberOfAttachmentsChange = (type: string) => (maxNumberOfAttachments: number) => {
    const componentCopy = { ...component } as
      | FormFileUploaderComponent
      | FormFileUploaderWithTagComponent;
    if (type === 'max') {
      componentCopy.maxNumberOfAttachments =
        maxNumberOfAttachments >= 1 ? maxNumberOfAttachments : 1;
    } else {
      componentCopy.minNumberOfAttachments =
        maxNumberOfAttachments >= 0 ? maxNumberOfAttachments : 0;
      componentCopy.required = maxNumberOfAttachments > 0;
    }
    handleComponentChange(componentCopy);
  };

  const handleMaxFileSizeInMBChange = (maxFileSizeInMB: number) => {
    const componentCopy = { ...component } as
      | FormFileUploaderComponent
      | FormFileUploaderWithTagComponent;
    componentCopy.maxFileSizeInMB = maxFileSizeInMB >= 0 ? maxFileSizeInMB : 0;
    handleComponentChange(componentCopy);
  };

  return (
    <Fieldset className={classes.fieldset}>
      <FormField
        id={component.id}
        onChange={handleHasCustomFileEndingsChange}
        value={fileUploaderComponent.hasCustomFileEndings}
        propertyPath={`${component.propertyPath}/properties/hasCustomFileEndings`}
      >
        {({ value }) => (
          <LegacyRadioGroup
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
            variant='horizontal'
            value={value === true ? 'true' : 'false'}
          />
        )}
      </FormField>
      {fileUploaderComponent.hasCustomFileEndings && (
        <FormField
          id={component.id}
          label={t('ux_editor.modal_properties_valid_file_endings_helper')}
          onChange={handleValidFileEndingsChange}
          value={fileUploaderComponent.validFileEndings}
          propertyPath={`${component.propertyPath}/properties/validFileEndings`}
        >
          {({ onChange }) => (
            <TextField
              name='modal-properties-valid-file-endings'
              onChange={(e) => onChange(e.target.value, e)}
            />
          )}
        </FormField>
      )}
      {component.type === ComponentType.FileUpload && (
        <FormField
          id={component.id}
          onChange={handleDisplayModeChange}
          value={fileUploaderComponent.displayMode}
          propertyPath={`${component.propertyPath}/properties/displayMode`}
        >
          {() => (
            <LegacyRadioGroup
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
              variant='horizontal'
            />
          )}
        </FormField>
      )}
      <FormField
        id={component.id}
        label={t('ux_editor.modal_properties_minimum_files')}
        onChange={handleNumberOfAttachmentsChange('min')}
        value={fileUploaderComponent.minNumberOfAttachments || 0}
        propertyPath={`${component.propertyPath}/properties/minNumberOfAttachments`}
      >
        {({ onChange }) => (
          <TextField
            name={`modal-properties-minimum-files-input-${fileUploaderComponent.id}`}
            formatting={{ number: {} }}
            onChange={(e) => onChange(parseInt(e.target.value, 10), e)}
          />
        )}
      </FormField>
      <FormField
        id={component.id}
        label={t('ux_editor.modal_properties_maximum_files')}
        onChange={handleNumberOfAttachmentsChange('max')}
        value={fileUploaderComponent.maxNumberOfAttachments || 1}
        propertyPath={`${component.propertyPath}/properties/maxNumberOfAttachments`}
      >
        {({ onChange }) => (
          <TextField
            name={`modal-properties-maximum-files-input-${fileUploaderComponent.id}`}
            formatting={{ number: {} }}
            onChange={(e) => onChange(parseInt(e.target.value, 10), e)}
          />
        )}
      </FormField>
      <FormField
        id={component.id}
        label={`${t('ux_editor.modal_properties_maximum_file_size')} (${t(
          'ux_editor.modal_properties_maximum_file_size_helper'
        )})`}
        onChange={handleMaxFileSizeInMBChange}
        value={fileUploaderComponent.maxFileSizeInMB || 0}
        propertyPath={`${component.propertyPath}/properties/maxFileSizeInMB`}
      >
        {({ onChange }) => (
          <TextField
            name='modal-properties-file-size'
            formatting={{ number: {} }}
            onChange={(e) => onChange(parseInt(e.target.value, 10), e)}
          />
        )}
      </FormField>
    </Fieldset>
  );
};
