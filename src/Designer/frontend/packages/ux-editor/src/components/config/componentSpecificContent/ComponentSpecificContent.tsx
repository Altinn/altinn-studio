import React from 'react';
import { ImageComponent } from './Image';
import type { IGenericEditComponent } from '../componentConfig';
import { ComponentType } from 'app-shared/types/ComponentType';
import { MapComponent } from './Map';
import { AttachmentListComponent } from './AttachmentList';
import { Summary2Component } from './Summary2';
import classes from './ComponentSpecificContent.module.css';
import { ImageUploadComponent } from './ImageUpload';
import { TextComponent } from './TextComponent';

export function ComponentSpecificContent({
  component,
  handleComponentChange,
}: IGenericEditComponent) {
  switch (component.type) {
    case ComponentType.Image: {
      return (
        <ImageComponent
          component={component}
          handleComponentChange={handleComponentChange}
          className={classes.containerWrapper}
        />
      );
    }
    case ComponentType.Map: {
      return (
        <MapComponent
          component={component}
          handleComponentChange={handleComponentChange}
          className={classes.containerWrapper}
        />
      );
    }

    case ComponentType.AttachmentList: {
      return (
        <AttachmentListComponent
          component={component}
          handleComponentChange={handleComponentChange}
          className={classes.containerWrapper}
        />
      );
    }

    case ComponentType.Summary2: {
      return (
        <Summary2Component
          component={component}
          handleComponentChange={handleComponentChange}
          className={classes.containerWrapper}
        />
      );
    }

    case ComponentType.ImageUpload: {
      return (
        <ImageUploadComponent
          component={component}
          handleComponentChange={handleComponentChange}
          className={classes.containerWrapper}
        />
      );
    }

    case ComponentType.Text: {
      return (
        <TextComponent
          component={component}
          handleComponentChange={handleComponentChange}
          className={classes.containerWrapper}
        />
      );
    }

    default: {
      return null;
    }
  }
}
