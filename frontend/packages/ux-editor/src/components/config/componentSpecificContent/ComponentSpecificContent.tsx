import React from 'react';
import { ImageComponent } from './Image';
import { ButtonComponent } from './Button';
import { AddressComponent } from './Address';
import { FileUploadComponent } from './FileUpload';
import { SelectComponent } from './Select';
import type { IGenericEditComponent } from '../componentConfig';
import { ComponentTypes } from '../..';
import { useText } from '../../../hooks';
import type { IFormImageComponent } from '../../../types/global';

export function ComponentSpecificContent({
  component,
  handleComponentChange
}: IGenericEditComponent) {
  const translate = useText();

  switch (component.type) {
    case ComponentTypes.NavigationButtons:
    case ComponentTypes.Button:
      return (
        <ButtonComponent component={component} handleComponentChange={handleComponentChange} />
      );

    case ComponentTypes.AddressComponent:
      return (
        <AddressComponent component={component} handleComponentChange={handleComponentChange} />
      );

    case ComponentTypes.FileUpload:
    case ComponentTypes.FileUploadWithTag:
      return (
        <FileUploadComponent component={component} handleComponentChange={handleComponentChange} />
      );

    case ComponentTypes.Image: {
      return (
        <ImageComponent
          component={component as IFormImageComponent}
          handleComponentUpdate={handleComponentChange}
        />
      );
    }

    case ComponentTypes.Panel: {
      return (
        <SelectComponent
          label={translate('ux_editor.choose_variant')}
          optionKey='variant'
          options={[translate('ux_editor.info'), translate('ux_editor.warning'), translate('ux_editor.success')]}
          component={component}
          handleComponentChange={handleComponentChange}
        />
      );
    }
    default: {
      return null;
    }
  }
}
