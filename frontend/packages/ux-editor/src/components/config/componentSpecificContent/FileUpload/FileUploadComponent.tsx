import React from 'react';
import { FieldSet, RadioGroup, RadioGroupVariant, TextField } from '@altinn/altinn-design-system';
import classes from './FileUploadComponent.module.css';
import { EditTitle } from '../../editModal/EditTitle';
import { useText } from '../../../../hooks';
import { IGenericEditComponent } from '../../componentConfig';
import { IFormFileUploaderComponent, IFormFileUploaderWithTagComponent } from '../../../../types/global';
import { EditDescription } from '../../editModal/EditDescription';
import { TextResource } from '../../../TextResource';
import { ComponentTypes } from '../../../index';

export const FileUploadComponent = ({
  component,
  handleComponentChange,
}: IGenericEditComponent) => {
  const t = useText();

  const fileUploaderComponent = component as IFormFileUploaderComponent;

  const handleDisplayModeChange = (displayMode: string) =>
    handleComponentChange({ ...component, displayMode });

  const handleTagTitleChange = (id: string): void => {
    const updatedComponent = { ...component };
    updatedComponent.textResourceBindings.tagTitle = id;
    handleComponentChange(updatedComponent);
  };

  const handleOptionsIdChange = (e: any) => {
    handleComponentChange({
      ...component,
      optionsId: e.target.value,
    });
  };

  const handleHasCustomFileEndingsChange = (value: string) => {
    const componentCopy = { ...component } as
      | IFormFileUploaderComponent
      | IFormFileUploaderWithTagComponent;
    componentCopy.hasCustomFileEndings = value === 'true';
    if (!componentCopy.hasCustomFileEndings) {
      componentCopy.validFileEndings = undefined;
    }
    handleComponentChange(componentCopy);
  };

  const handleValidFileEndingsChange = (event: any) =>
    handleComponentChange({ ...component, validFileEndings: event.target.value } as
      | IFormFileUploaderComponent
      | IFormFileUploaderWithTagComponent);

  const handleNumberOfAttachmentsChange = (type: string) => (event: any) => {
    const componentCopy = { ...component } as
      | IFormFileUploaderComponent
      | IFormFileUploaderWithTagComponent;
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
      | IFormFileUploaderComponent
      | IFormFileUploaderWithTagComponent;
    const value = parseInt(event.target.value, 10);
    componentCopy.maxFileSizeInMB = value >= 0 ? value : 0;
    handleComponentChange(componentCopy);
  };

  return (
    <FieldSet className={classes.fieldset}>
      {
        component.type === ComponentTypes.FileUpload ? (
          <>
            <RadioGroup
              items={[
                {
                  label: t('ux_editor.modal_properties_file_upload_simple'),
                  value: 'simple',
                },
                {
                  label: t('ux_editor.modal_properties_file_upload_list'),
                  value: 'list',
                }
              ]}
              name={`${component.id}-display-mode`}
              onChange={handleDisplayModeChange}
              value={fileUploaderComponent.displayMode}
              variant={RadioGroupVariant.Horizontal}
            />
            <FieldSet className={classes.fieldset}>
              <EditTitle
                component={component}
                handleComponentChange={handleComponentChange}
              />
              <EditDescription
                component={component}
                handleComponentChange={handleComponentChange}
              />
            </FieldSet>
          </>
        ) : (
          <>
            <TextResource
              handleIdChange={handleTagTitleChange}
              label={t('ux_editor.modal_properties_tag')}
              placeholder={t('ux_editor.modal_properties_tag_add')}
              textResourceId={component.textResourceBindings?.tagTitle}
            />
            <div>
              <TextField
                id='modal-properties-code-list-id'
                label={t('ux_editor.modal_properties_code_list_id')}
                onChange={handleOptionsIdChange}
                value={component.optionsId}
              />
            </div>
            <p>
              <a
                target='_blank'
                rel='noopener noreferrer'
                href='https://docs.altinn.studio/app/development/data/options/'
              >
                {t('ux_editor.modal_properties_code_list_read_more')}
              </a>
            </p>
          </>
        )
      }

      <RadioGroup
        items={[
          {
            label: t('ux_editor.modal_properties_valid_file_endings_all'),
            value: 'false',
          },
          {
            label: t('ux_editor.modal_properties_valid_file_endings_custom'),
            value: 'true',
          }
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
}
