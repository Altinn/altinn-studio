import React from 'react';
import { ComponentType } from 'app-shared/types/ComponentType';
import { SummaryMainConfig } from './SpecificMainConfig/SummaryMainConfig';
import type { FormItem } from '@altinn/ux-editor/types/FormItem';
import { SubformMainConfig } from './SpecificMainConfig/SubformMainConfig';
import { OptionsMainConfig } from './SpecificMainConfig/OptionsMainConfig';
import { ImageMainConfig } from './SpecificMainConfig/ImageMainConfig';
import classes from './ComponentMainConfig.module.css';
import { AlertMainConfig } from './SpecificMainConfig/AlertMainConfig';

export type ComponentMainConfigProps = {
  component: FormItem;
  handleComponentChange: (component: FormItem) => void;
};

export const ComponentMainConfig = ({
  component,
  handleComponentChange,
}: ComponentMainConfigProps) => {
  switch (component.type) {
    case ComponentType.Summary2:
      return (
        <SummaryMainConfig
          component={component}
          handleComponentChange={handleComponentChange}
          className={classes.mainConfigWrapper}
        />
      );
    case ComponentType.Subform:
      return (
        <SubformMainConfig
          component={component}
          handleComponentChange={handleComponentChange}
          className={classes.mainConfigWrapper}
        />
      );
    case ComponentType.Checkboxes:
    case ComponentType.RadioButtons:
    case ComponentType.Dropdown:
    case ComponentType.MultipleSelect:
    case ComponentType.Likert:
      return (
        <OptionsMainConfig component={component} handleComponentChange={handleComponentChange} />
      );
    case ComponentType.Image:
      return (
        <ImageMainConfig component={component} handleComponentChange={handleComponentChange} />
      );
    case ComponentType.Alert:
      return (
        <AlertMainConfig
          component={component}
          handleComponentChange={handleComponentChange}
          className={classes.mainConfigWrapper}
        />
      );
    default:
      return null;
  }
};
