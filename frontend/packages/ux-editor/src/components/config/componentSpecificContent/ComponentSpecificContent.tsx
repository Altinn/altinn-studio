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
import { MapComponent } from './Map';
import { EditTextResourceBinding } from '../editModal/EditTextResourceBinding';

export function ComponentSpecificContent({
  component,
  handleComponentChange,
  layoutName,
}: IGenericEditComponent) {
  const t = useText();

  switch (component.type) {
    case ComponentTypes.NavigationButtons:
    case ComponentTypes.Button:
      return (
        <ButtonComponent
          component={component}
          handleComponentChange={handleComponentChange}
          layoutName={layoutName}
        />
      );

    case ComponentTypes.AddressComponent:
      return (
        <AddressComponent
          component={component}
          handleComponentChange={handleComponentChange}
          layoutName={layoutName}
        />
      );

    case ComponentTypes.FileUpload:
    case ComponentTypes.FileUploadWithTag:
      return (
        <FileUploadComponent
          component={component}
          handleComponentChange={handleComponentChange}
          layoutName={layoutName}
        />
      );

    case ComponentTypes.Image: {
      return (
        <ImageComponent
          component={component as IFormImageComponent}
          handleComponentChange={handleComponentChange}
          layoutName={layoutName}
        />
      );
    }

    case ComponentTypes.Panel: {
      return (
        <>
          <EditTextResourceBinding
            component={component}
            handleComponentChange={handleComponentChange}
            textKey='body'
            labelKey='ux_editor.modal_text_resource_body'
          />
          <CheckboxComponent
            label={t('ux_editor.show_icon')}
            defaultValue={true}
            component={component}
            onChangeKey='showIcon'
            handleComponentChange={handleComponentChange}
          />
          <SelectComponent
            label={t('ux_editor.choose_variant')}
            defaultValue='info'
            optionKey='variant'
            options={[
              {
                label: t('ux_editor.info'),
                value: 'info',
              },
              {
                label: t('ux_editor.warning'),
                value: 'warning',
              },
              {
                label: t('ux_editor.success'),
                value: 'success',
              },
            ]}
            component={component}
            handleComponentChange={handleComponentChange}
            value={component.variant}
          />
        </>
      );
    }

    case ComponentTypes.Map: {
      return <MapComponent component={component} handleComponentChange={handleComponentChange} />;
    }
    default: {
      return null;
    }
  }
}
