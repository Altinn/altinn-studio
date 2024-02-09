import React from 'react';
import { ImageComponent } from './Image';
import { PanelComponent } from './Panel';
import { ButtonComponent } from './Button';
import { AddressComponent } from './Address';
import { FileUploadComponent } from './FileUpload';
import type { IGenericEditComponent } from '../componentConfig';
import { MapComponent } from './Map';
import { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';

export function ComponentSpecificContent({
  component,
  handleComponentChange,
  layoutName,
}: IGenericEditComponent) {
  switch (component.type) {
    case ComponentTypeV3.NavigationButtons:
    case ComponentTypeV3.Button:
      return (
        <ButtonComponent
          component={component}
          handleComponentChange={handleComponentChange}
          layoutName={layoutName}
        />
      );

    case ComponentTypeV3.AddressComponent:
      return (
        <AddressComponent
          component={component}
          handleComponentChange={handleComponentChange}
          layoutName={layoutName}
        />
      );

    case ComponentTypeV3.FileUpload:
    case ComponentTypeV3.FileUploadWithTag:
      return (
        <FileUploadComponent
          component={component}
          handleComponentChange={handleComponentChange}
          layoutName={layoutName}
        />
      );

    case ComponentTypeV3.Image: {
      return (
        <ImageComponent
          component={component}
          handleComponentChange={handleComponentChange}
          layoutName={layoutName}
        />
      );
    }

    case ComponentTypeV3.Panel: {
      return <PanelComponent component={component} handleComponentChange={handleComponentChange} />;
    }

    case ComponentTypeV3.Map: {
      return <MapComponent component={component} handleComponentChange={handleComponentChange} />;
    }
    default: {
      return null;
    }
  }
}
