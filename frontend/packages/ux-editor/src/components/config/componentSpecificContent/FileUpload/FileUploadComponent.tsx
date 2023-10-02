import React, { Children } from 'react';
import { LegacyFieldSet, Radio, LegacyTextField } from '@digdir/design-system-react';
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
    <LegacyFieldSet className={classes.fieldset}>
      <FormField
        id={component.id}
        onChange={handleHasCustomFileEndingsChange}
        value={fileUploaderComponent.hasCustomFileEndings ? 'true' : 'false'}
        propertyPath={`${component.propertyPath}/properties/hasCustomFileEndings`}
      >
        {({ value }) => (
          <Radio.Group name={`${component.id}-valid-file-endings`} inline={true} value={value}>
            {Children.toArray([
              <Radio value='false'>{t('ux_editor.modal_properties_valid_file_endings_all')}</Radio>,
              <Radio value='true'>
                {t('ux_editor.modal_properties_valid_file_endings_custom')}
              </Radio>,
            ])}
          </Radio.Group>
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
            <LegacyTextField
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
            <Radio.Group name={`${component.id}-display-mode`} inline={true}>
              {Children.toArray([
                <Radio value='simple'>{t('ux_editor.modal_properties_file_upload_simple')}</Radio>,
                <Radio value='list'>{t('ux_editor.modal_properties_file_upload_list')}</Radio>,
              ])}
            </Radio.Group>
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
          <LegacyTextField
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
          <LegacyTextField
            name={`modal-properties-maximum-files-input-${fileUploaderComponent.id}`}
            formatting={{ number: {} }}
            onChange={(e) => onChange(parseInt(e.target.value, 10), e)}
          />
        )}
      </FormField>
      <FormField
        id={component.id}
        label={`${t('ux_editor.modal_properties_maximum_file_size')} (${t(
          'ux_editor.modal_properties_maximum_file_size_helper',
        )})`}
        onChange={handleMaxFileSizeInMBChange}
        value={fileUploaderComponent.maxFileSizeInMB || 0}
        propertyPath={`${component.propertyPath}/properties/maxFileSizeInMB`}
      >
        {({ onChange }) => (
          <LegacyTextField
            name='modal-properties-file-size'
            formatting={{ number: {} }}
            onChange={(e) => onChange(parseInt(e.target.value, 10), e)}
          />
        )}
      </FormField>
    </LegacyFieldSet>
  );
};
