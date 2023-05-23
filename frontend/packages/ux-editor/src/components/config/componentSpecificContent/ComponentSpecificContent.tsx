import React from 'react';
import { ImageComponent } from './Image';
import { ButtonComponent } from './Button';
import { AddressComponent } from './Address';
import { FileUploadComponent } from './FileUpload';
import { SelectComponent } from './Select';
import { CheckboxComponent } from './Checkbox';
import type { IGenericEditComponent } from '../componentConfig';
import { FormItemType } from 'app-shared/types/FormItemType';
import { useText } from '../../../hooks';
import { MapComponent } from './Map';
import { EditTextResourceBinding } from '../editModal/EditTextResourceBinding';

export function ComponentSpecificContent({
  component,
  handleComponentChange,
  layoutName,
}: IGenericEditComponent) {
  const t = useText();

  switch (component.type) {
    case FormItemType.NavigationButtons:
    case FormItemType.Button:
      return (
        <ButtonComponent
          component={component}
          handleComponentChange={handleComponentChange}
          layoutName={layoutName}
        />
      );

    case FormItemType.AddressComponent:
      return (
        <AddressComponent
          component={component}
          handleComponentChange={handleComponentChange}
          layoutName={layoutName}
        />
      );

    case FormItemType.FileUpload:
    case FormItemType.FileUploadWithTag:
      return (
        <FileUploadComponent
          component={component}
          handleComponentChange={handleComponentChange}
          layoutName={layoutName}
        />
      );

    case FormItemType.Image: {
      return (
        <ImageComponent
          component={component}
          handleComponentChange={handleComponentChange}
          layoutName={layoutName}
        />
      );
    }

    case FormItemType.Panel: {
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
            defaultValue={component.variant?.enum || 'info'}
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
          />
        </>
      );
    }

    case FormItemType.Map: {
      return <MapComponent component={component} handleComponentChange={handleComponentChange} />;
    }
    default: {
      return null;
    }
  }
}
