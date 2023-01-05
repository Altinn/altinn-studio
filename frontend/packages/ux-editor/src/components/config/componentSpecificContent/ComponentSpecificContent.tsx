import React from 'react';
import { ImageComponent } from './Image';
import { ButtonComponent } from './Button';
import { AddressComponent } from './Address';
import { FileUploadComponent } from './FileUpload';
import { SelectComponent } from './Select';
import { CheckboxComponent } from './Checkbox';
import type { IGenericEditComponent } from '../componentConfig';
import { ComponentTypes } from '../..';
import { useText } from '../../../hooks';
import type { IFormImageComponent } from '../../../types/global';

export function ComponentSpecificContent({
  component,
  handleComponentChange
}: IGenericEditComponent) {
  const t = useText();

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
        <>
          <CheckboxComponent
            label={t('ux_editor.show_icon')}
            defaultValue={true}
            component={component}
            onChangeKey='showIcon'
            handleComponentChange={handleComponentChange}
          />
          <SelectComponent
            label={t('ux_editor.choose_variant')}
            defaultValue={t('ux_editor.info')}
            optionKey='variant'
            options={[t('ux_editor.info'), t('ux_editor.warning'), t('ux_editor.success')]}
            component={component}
            handleComponentChange={handleComponentChange}
          />
        </>
      );
    }
    default: {
      return null;
    }
  }
}
