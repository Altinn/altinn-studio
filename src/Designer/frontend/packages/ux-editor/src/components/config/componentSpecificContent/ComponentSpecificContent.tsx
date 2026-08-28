import type { IGenericEditComponent } from '../componentConfig';
import { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import { MapComponent } from './Map';
import { AttachmentListComponent } from './AttachmentList';
import classes from './ComponentSpecificContent.module.css';

export function ComponentSpecificContent({
  component,
  handleComponentChange,
}: IGenericEditComponent) {
  switch (component.type) {
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

    default: {
      return null;
    }
  }
}
