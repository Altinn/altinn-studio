import React from 'react';

import classes from '../EditModalContent.module.css';
import { Checkbox, FieldSet, Select, TextField } from '@altinn/altinn-design-system';
import { ComponentTypes } from '../..';
import type {
  IFormAddressComponent,
  IFormFileUploaderComponent,
  IFormFileUploaderWithTagComponent,
  IFormImageComponent,
} from 'ux-editor/types/global';
import { EditTitle } from '../editModal/EditTitle';
import type { IGenericEditComponent } from '../componentConfig';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { AddressKeys, getTextResourceByAddressKey } from 'ux-editor/utils/component';
import { EditDataModelBindings } from '../editModal/EditDataModelBindings';
import AltinnRadioGroup from 'app-shared/components/AltinnRadioGroup';
import AltinnRadio from 'app-shared/components/AltinnRadio';
import { EditDescription } from '../editModal/EditDescription';
import { FileUploadWithTagComponent } from './FileUploadWithTag';
import { ImageComponent } from './Image';

export function ComponentSpecificContent({
  component,
  handleComponentChange,
  language,
  textResources,
}: IGenericEditComponent) {
  const t = (key: string) => getLanguageFromKey(key, language);

  const handleButtonTypeChange = (selected: any) => {
    const componentCopy = { ...component };
    if (!componentCopy.textResourceBindings) {
      componentCopy.textResourceBindings = {};
    }
    if (selected.value === 'NavigationButtons') {
      componentCopy.type = 'NavigationButtons';
      componentCopy.textResourceBindings.title = undefined;
      (componentCopy as any).textResourceId = undefined;
      componentCopy.customType = undefined;
      (componentCopy as any).showBackButton = true;
      componentCopy.textResourceBindings.next = 'next';
      componentCopy.textResourceBindings.back = 'back';
    } else if (selected.value === 'Button') {
      componentCopy.type = 'Button';
      componentCopy.textResourceBindings.next = undefined;
      componentCopy.textResourceBindings.back = undefined;
      (componentCopy as any).showPrev = undefined;
      (componentCopy as any).showBackButton = undefined;
      componentCopy.textResourceBindings.title = t('ux_editor.modal_properties_button_type_submit');
    }
    handleComponentChange(componentCopy);
  };

  const handleMaxFileSizeInMBChange = (event: any) => {
    const componentCopy = { ...component } as IFormFileUploaderComponent | IFormFileUploaderWithTagComponent;
    const value = parseInt(event.target.value, 10);
    componentCopy.maxFileSizeInMB = value >= 0 ? value : 0;
    handleComponentChange(componentCopy);
  };

  const handleNumberOfAttachmentsChange = (type: string) => (event: any) => {
    const componentCopy = { ...component } as IFormFileUploaderComponent | IFormFileUploaderWithTagComponent;
    const value = parseInt(event.target.value, 10);
    if (type === 'max') {
      componentCopy.maxNumberOfAttachments = value >= 1 ? value : 1;
    } else {
      componentCopy.minNumberOfAttachments = value >= 0 ? value : 0;
      componentCopy.required = value > 0;
    }
    handleComponentChange(componentCopy);
  };

  const handleValidFileEndingsChange = (event: any) =>
    handleComponentChange({ ...component, validFileEndings: event.target.value } as
      | IFormFileUploaderComponent
      | IFormFileUploaderWithTagComponent);

  const handleToggleAddressSimple = (event: object, checked: boolean) =>{
    handleComponentChange({
      ...component,
      simplified: checked,
    });
  };

  const handleDisplayModeChange = (e: any) => {
    handleComponentChange({
      ...component,
      displayMode: e.target.value,
    });
  };

  const handleHasCustomFileEndingsChange = (event: any) => {
    const componentCopy = { ...component } as IFormFileUploaderComponent | IFormFileUploaderWithTagComponent;
    componentCopy.hasCustomFileEndings = event.target.value === 'true';
    if (!componentCopy.hasCustomFileEndings) {
      componentCopy.validFileEndings = undefined;
    }
    handleComponentChange(componentCopy);
  };

  switch (component.type) {

    case ComponentTypes.NavigationButtons:
    case ComponentTypes.Button: {
      const types = [
        {
          value: 'Button',
          label: t('ux_editor.modal_properties_button_type_submit'),
        },
        {
          value: 'NavigationButtons',
          label: t('ux_editor.modal_properties_button_type_navigation'),
        },
      ];
      return (
        <FieldSet className={classes.fieldset}>
          <div>
            <p className={classes.inputHelper}>{t('ux_editor.modal_properties_button_type_helper')}</p>
            <Select
              options={types}
              value={types.find((element) => element.value === component.type).value}
              onChange={handleButtonTypeChange}
            />
          </div>
          {component.type === 'Button' && (
            <EditTitle
              component={component}
              handleComponentChange={handleComponentChange}
              language={language}
              textResources={textResources}
            />
          )}
        </FieldSet>
      );
    }

    case ComponentTypes.AddressComponent: {
      return (
        <FieldSet className={classes.fieldset}>
          <div>
            <Checkbox
              checked={(component as IFormAddressComponent).simplified}
              label={t('ux_editor.modal_configure_address_component_simplified')}
              onChange={(e) => handleToggleAddressSimple(e, e.target.checked)}
            />
          </div>
          {Object.keys(AddressKeys).map((value: AddressKeys, index) => {
            const simple: boolean = (component as IFormAddressComponent).simplified;
            if (simple && (value === AddressKeys.careOf || value === AddressKeys.houseNumber)) {
              return null;
            }
            return (
              <EditDataModelBindings
                component={component}
                handleComponentChange={handleComponentChange}
                key={value}
                language={language}
                textResources={textResources}
                renderOptions={{
                  label: getTextResourceByAddressKey(value, language),
                  returnValue: value,
                  key: value,
                  uniqueKey: index,
                }}
              />
            );
          })}
        </FieldSet>
      );
    }

    case ComponentTypes.FileUpload: {
      const fileUploaderComponent = component as IFormFileUploaderComponent;
      return (
        <FieldSet className={classes.fieldset}>
          <div>
            <AltinnRadioGroup
              row={true}
              value={fileUploaderComponent.displayMode}
              onChange={handleDisplayModeChange}
            >
              <AltinnRadio
                label={t('ux_editor.modal_properties_file_upload_simple')}
                value='simple'
              />
              <AltinnRadio
                label={t('ux_editor.modal_properties_file_upload_list')}
                value='list'
              />
            </AltinnRadioGroup>
          </div>
          <FieldSet className={classes.fieldset}>
            <EditTitle
              component={component}
              handleComponentChange={handleComponentChange}
              language={language}
              textResources={textResources}
            />
            <EditDescription
              component={component}
              handleComponentChange={handleComponentChange}
              language={language}
              textResources={textResources}
            />
          </FieldSet>
          <div>
            <AltinnRadioGroup
              row={true}
              value={fileUploaderComponent.hasCustomFileEndings ? 'true' : 'false'}
              onChange={handleHasCustomFileEndingsChange}
            >
              <AltinnRadio
                label={t('ux_editor.modal_properties_valid_file_endings_all')}
                value='false'
              />
              <AltinnRadio
                label={t('ux_editor.modal_properties_valid_file_endings_custom')}
                value='true'
              />
            </AltinnRadioGroup>
          </div>

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
                'ux_editor.modal_properties_maximum_file_size_helper',
              )})`}
              onChange={handleMaxFileSizeInMBChange}
              value={(fileUploaderComponent.maxFileSizeInMB || 0).toString()}
            />
          </div>
        </FieldSet>
      );
    }

    case ComponentTypes.FileUploadWithTag: {
      return (
        <FieldSet className={classes.fieldset}>
          <FileUploadWithTagComponent
            component={component as IFormFileUploaderWithTagComponent}
            stateComponent={component}
            language={language}
            textResources={textResources}
            handleComponentUpdate={handleComponentChange}
            handleNumberOfAttachmentsChange={handleNumberOfAttachmentsChange}
            handleMaxFileSizeInMBChange={handleMaxFileSizeInMBChange}
            handleHasCustomFileEndingsChange={handleHasCustomFileEndingsChange}
            handleValidFileEndingsChange={handleValidFileEndingsChange}
          />
        </FieldSet>
      );
    }

    case ComponentTypes.Image: {
      return (
        <FieldSet className={classes.fieldset}>
          <ImageComponent
            component={component as IFormImageComponent}
            handleComponentUpdate={handleComponentChange}
            language={language}
            textResources={textResources}
          />
        </FieldSet>
      );
    }

    default: {
      return null;
    }
  }
}
