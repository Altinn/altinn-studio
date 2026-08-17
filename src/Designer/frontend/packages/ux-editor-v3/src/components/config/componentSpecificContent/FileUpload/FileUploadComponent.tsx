import classes from './FileUploadComponent.module.css';
import { useText } from '../../../../hooks';
import type { IGenericEditComponent } from '../../componentConfig';
import type {
  FormFileUploaderComponent,
  FormFileUploaderWithTagComponent,
} from '../../../../types/FormComponent';
import { FormField } from '../../../FormField';
import { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import { StudioFieldset, StudioRadio, StudioRadioGroup, StudioTextfield } from '@studio/components';

export const FileUploadComponent = ({
  component,
  handleComponentChange,
}: IGenericEditComponent) => {
  const t = useText();

  const fileUploaderComponent = component as FormFileUploaderComponent;

  const handleDisplayModeChange = (displayMode: string) =>
    handleComponentChange({ ...component, displayMode });

  const handleHasCustomFileEndingsChange = (hasCustomFileEndings: string) => {
    const componentCopy = { ...component } as
      FormFileUploaderComponent | FormFileUploaderWithTagComponent;
    componentCopy.hasCustomFileEndings = hasCustomFileEndings === 'true';
    if (!componentCopy.hasCustomFileEndings) {
      componentCopy.validFileEndings = undefined;
    }
    handleComponentChange(componentCopy);
  };

  const handleValidFileEndingsChange = (validFileEndings: string) =>
    handleComponentChange({ ...component, validFileEndings } as
      FormFileUploaderComponent | FormFileUploaderWithTagComponent);

  const handleNumberOfAttachmentsChange = (type: string) => (maxNumberOfAttachments: number) => {
    const componentCopy = { ...component } as
      FormFileUploaderComponent | FormFileUploaderWithTagComponent;
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
      FormFileUploaderComponent | FormFileUploaderWithTagComponent;
    componentCopy.maxFileSizeInMB = maxFileSizeInMB >= 0 ? maxFileSizeInMB : 0;
    handleComponentChange(componentCopy);
  };

  return (
    <StudioFieldset
      className={classes.fieldset}
      legend={t('ux_editor.file_upload_component.settings')}
      hideLegend
    >
      <FormField
        id={component.id}
        value={fileUploaderComponent.hasCustomFileEndings}
        propertyPath={`${component.propertyPath}/properties/hasCustomFileEndings`}
        renderField={({ fieldProps }) => (
          <StudioRadioGroup
            legend={t('ux_editor.file_upload_component.valid_file_endings')}
            hideLegend
          >
            <div className={classes.inlineRadios}>
              <StudioRadio
                name={`${component.id}-valid-file-endings`}
                value='false'
                checked={fieldProps.value !== true}
                onChange={(e) => handleHasCustomFileEndingsChange(e.target.value)}
                label={t('ux_editor.modal_properties_valid_file_endings_all')}
              />
              <StudioRadio
                name={`${component.id}-valid-file-endings`}
                value='true'
                checked={fieldProps.value === true}
                onChange={(e) => handleHasCustomFileEndingsChange(e.target.value)}
                label={t('ux_editor.modal_properties_valid_file_endings_custom')}
              />
            </div>
          </StudioRadioGroup>
        )}
      />

      {fileUploaderComponent.hasCustomFileEndings && (
        <FormField
          id={component.id}
          label={t('ux_editor.modal_properties_valid_file_endings_helper')}
          onChange={handleValidFileEndingsChange}
          value={fileUploaderComponent.validFileEndings}
          propertyPath={`${component.propertyPath}/properties/validFileEndings`}
          renderField={({ fieldProps }) => (
            <StudioTextfield
              {...fieldProps}
              name='modal-properties-valid-file-endings'
              onChange={(e) => fieldProps.onChange(e.target.value, e)}
            />
          )}
        />
      )}

      {component.type === ComponentTypeV3.FileUpload && (
        <FormField
          id={component.id}
          onChange={handleDisplayModeChange}
          value={fileUploaderComponent.displayMode}
          propertyPath={`${component.propertyPath}/properties/displayMode`}
          renderField={({ fieldProps }) => (
            <StudioRadioGroup legend={t('ux_editor.file_upload_component.display_mode')} hideLegend>
              <div className={classes.inlineRadios}>
                <StudioRadio
                  name={`${component.id}-display-mode`}
                  value='simple'
                  checked={fieldProps.value === 'simple'}
                  onChange={(e) => fieldProps.onChange(e.target.value, e)}
                  label={t('ux_editor.modal_properties_file_upload_simple')}
                />
                <StudioRadio
                  name={`${component.id}-display-mode`}
                  value='list'
                  checked={fieldProps.value === 'list'}
                  onChange={(e) => fieldProps.onChange(e.target.value, e)}
                  label={t('ux_editor.modal_properties_file_upload_list')}
                />
              </div>
            </StudioRadioGroup>
          )}
        />
      )}

      <FormField
        id={component.id}
        label={t('ux_editor.modal_properties_minimum_files')}
        onChange={handleNumberOfAttachmentsChange('min')}
        value={fileUploaderComponent.minNumberOfAttachments || 0}
        propertyPath={`${component.propertyPath}/properties/minNumberOfAttachments`}
        renderField={({ fieldProps }) => (
          <StudioTextfield
            {...fieldProps}
            name={`modal-properties-minimum-files-input-${fileUploaderComponent.id}`}
            type='number'
            onChange={(e) => fieldProps.onChange(parseInt(e.target.value, 10), e)}
          />
        )}
      />

      <FormField
        id={component.id}
        label={t('ux_editor.modal_properties_maximum_files')}
        onChange={handleNumberOfAttachmentsChange('max')}
        value={fileUploaderComponent.maxNumberOfAttachments || 1}
        propertyPath={`${component.propertyPath}/properties/maxNumberOfAttachments`}
        renderField={({ fieldProps }) => (
          <StudioTextfield
            {...fieldProps}
            name={`modal-properties-maximum-files-input-${fileUploaderComponent.id}`}
            type='number'
            onChange={(e) => fieldProps.onChange(parseInt(e.target.value, 10), e)}
          />
        )}
      />

      <FormField
        id={component.id}
        label={`${t('ux_editor.modal_properties_maximum_file_size')} (${t(
          'ux_editor.modal_properties_maximum_file_size_helper',
        )})`}
        onChange={handleMaxFileSizeInMBChange}
        value={fileUploaderComponent.maxFileSizeInMB || 0}
        propertyPath={`${component.propertyPath}/properties/maxFileSizeInMB`}
        renderField={({ fieldProps }) => (
          <StudioTextfield
            {...fieldProps}
            name='modal-properties-file-size'
            type='number'
            onChange={(e) => fieldProps.onChange(parseInt(e.target.value, 10), e)}
          />
        )}
      />
    </StudioFieldset>
  );
};
