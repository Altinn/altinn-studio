import React from 'react';
import { ImageComponent } from './Image';
import { PanelComponent } from './Panel';
import { AddressComponent } from './Address';
import { FileUploadComponent } from './FileUpload';
import type { IGenericEditComponent } from '../componentConfig';
import { ComponentType } from 'app-shared/types/ComponentType';
import { MapComponent } from './Map';
import { AttachmentListComponent } from './AttachmentList';
import { RepeatingGroupComponent } from './RepeatingGroup';

export function ComponentSpecificContent({
  component,
  handleComponentChange,
  layoutName,
}: IGenericEditComponent) {
  switch (component.type) {
    case ComponentType.Address:
      return (
        <AddressComponent
          component={component}
          handleComponentChange={handleComponentChange}
          layoutName={layoutName}
        />
      );

    case ComponentType.FileUpload:
    case ComponentType.FileUploadWithTag:
      return (
        <FileUploadComponent
          component={component}
          handleComponentChange={handleComponentChange}
          layoutName={layoutName}
        />
      );

    case ComponentType.Image: {
      return (
        <ImageComponent
          component={component}
          handleComponentChange={handleComponentChange}
          layoutName={layoutName}
        />
      );
    }

    case ComponentType.Panel: {
      return <PanelComponent component={component} handleComponentChange={handleComponentChange} />;
    }

    case ComponentType.Map: {
      return <MapComponent component={component} handleComponentChange={handleComponentChange} />;
    }

    case ComponentType.AttachmentList: {
      return (
        <AttachmentListComponent
          component={component}
          handleComponentChange={handleComponentChange}
        />
      );
    }

    case ComponentType.RepeatingGroup: {
      return (
        <RepeatingGroupComponent
          editFormId={component.id}
          component={component}
          handleComponentUpdate={handleComponentChange}
        />
      );
    }

    default: {
      return null;
    }
  }
}
