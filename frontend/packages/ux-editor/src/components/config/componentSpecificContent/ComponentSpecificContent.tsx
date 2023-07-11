import React from 'react';
import { ImageComponent } from './Image';
import { PanelComponent } from './Panel';
import { ButtonComponent } from './Button';
import { AddressComponent } from './Address';
import { FileUploadComponent } from './FileUpload';
import type { IGenericEditComponent } from '../componentConfig';
import { ComponentType } from 'app-shared/types/ComponentType';
import { MapComponent } from './Map';

export interface ComponentSpecificContentProps extends IGenericEditComponent {
  isProd: boolean;
}

export function ComponentSpecificContent({
  component,
  handleComponentChange,
  layoutName,
  isProd,
}: ComponentSpecificContentProps) {
  switch (component.type) {
    case ComponentType.NavigationButtons:
    case ComponentType.Button:
    case ComponentType.ActionButton:
    case ComponentType.PrintButton:
    case ComponentType.InstantiationButton:
      return (
        <ButtonComponent
          component={component}
          handleComponentChange={handleComponentChange}
          layoutName={layoutName}
          isProd={isProd}
        />
      );

    case ComponentType.AddressComponent:
      return (
        <AddressComponent
          component={component}
          handleComponentChange={handleComponentChange}
          layoutName={layoutName}
          isProd={isProd}
        />
      );

    case ComponentType.FileUpload:
    case ComponentType.FileUploadWithTag:
      return (
        <FileUploadComponent
          component={component}
          handleComponentChange={handleComponentChange}
          layoutName={layoutName}
          isProd={isProd}
        />
      );

    case ComponentType.Image: {
      return (
        <ImageComponent
          component={component}
          handleComponentChange={handleComponentChange}
          layoutName={layoutName}
          isProd={isProd}
        />
      );
    }

    case ComponentType.Panel: {
      return (
        <PanelComponent
          component={component}
          handleComponentChange={handleComponentChange}
          isProd={isProd}
        />
      );
    }

    case ComponentType.Map: {
      return (
        <MapComponent
          component={component}
          isProd={isProd}
          handleComponentChange={handleComponentChange}
        />
      );
    }
    default: {
      return null;
    }
  }
}
