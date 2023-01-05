import React from 'react';

import { ComponentTypes } from '../..';
import type { IFormImageComponent } from '../../../types/global';
import type { IGenericEditComponent } from '../componentConfig';
import { ImageComponent } from './Image';
import { ButtonComponent } from './Button';
import { AddressComponent } from './Address';
import { FileUploadComponent } from './FileUpload';

export function ComponentSpecificContent({
  component,
  handleComponentChange,
}: IGenericEditComponent) {

  switch (component.type) {

    case ComponentTypes.NavigationButtons:
    case ComponentTypes.Button:
      return (
        <ButtonComponent
          component={component}
          handleComponentChange={handleComponentChange}
        />
      );

    case ComponentTypes.AddressComponent:
      return (
        <AddressComponent
          component={component}
          handleComponentChange={handleComponentChange}
        />
      );

    case ComponentTypes.FileUpload:
    case ComponentTypes.FileUploadWithTag:
      return (
        <FileUploadComponent
          component={component}
          handleComponentChange={handleComponentChange}
        />
      );

    case ComponentTypes.Image: {
      return (
        <ImageComponent
          component={component as IFormImageComponent}
          handleComponentUpdate={handleComponentChange}
        />
      );
    }

    default: {
      return null;
    }
  }
}
