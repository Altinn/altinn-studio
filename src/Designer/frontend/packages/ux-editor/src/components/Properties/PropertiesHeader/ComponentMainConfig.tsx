import React from 'react';
import { ComponentType } from 'app-shared/types/ComponentType';
import { SummaryMainConfig } from './SpecificMainConfig/SummaryMainConfig';
import type { FormItem } from '@altinn/ux-editor/types/FormItem';
import { SubformMainConfig } from './SpecificMainConfig/SubformMainConfig';
import { OptionsMainConfig } from './SpecificMainConfig/OptionsMainConfig';
import { ImageMainConfig } from './SpecificMainConfig/ImageMainConfig';
import classes from './ComponentMainConfig.module.css';
import { ActionButtonMainConfig } from './SpecificMainConfig/ActionButtonMainConfig';
import { FileUploadMainConfig } from './SpecificMainConfig/FileUploadMainConfig';
import { AlertMainConfig } from './SpecificMainConfig/AlertMainConfig';
import { LinkMainConfig } from './SpecificMainConfig/LinkMainConfig';
import { PanelMainConfig } from './SpecificMainConfig/PanelMainConfig';
import { TitleMainConfig } from './SpecificMainConfig/TitleMainConfig';
import { CustomButtonMainConfig } from './SpecificMainConfig/CustomButtonMainConfig';
import { ImageUploadComponent } from '../../config/componentSpecificContent/ImageUpload/ImageUploadComponent';
import { TextComponent } from '../../config/componentSpecificContent/TextComponent';

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
    case ComponentType.ActionButton:
      return (
        <ActionButtonMainConfig
          component={component}
          handleComponentChange={handleComponentChange}
          className={classes.mainConfigWrapper}
        />
      );
    case ComponentType.FileUpload:
    case ComponentType.FileUploadWithTag:
      return (
        <FileUploadMainConfig
          component={component}
          handleComponentChange={handleComponentChange}
          className={classes.mainConfigWrapper}
        />
      );
    case ComponentType.Alert:
      return (
        <AlertMainConfig
          component={component}
          handleComponentChange={handleComponentChange}
          className={classes.mainConfigWrapper}
        />
      );
    case ComponentType.Link:
      return (
        <LinkMainConfig
          component={component}
          handleComponentChange={handleComponentChange}
          className={classes.mainConfigWrapper}
        />
      );
    case ComponentType.Panel:
      return (
        <PanelMainConfig
          component={component}
          handleComponentChange={handleComponentChange}
          className={classes.mainConfigWrapper}
        />
      );
    case ComponentType.Header:
      return (
        <TitleMainConfig
          component={component}
          handleComponentChange={handleComponentChange}
          className={classes.mainConfigWrapper}
        />
      );
    case ComponentType.Text:
      return (
        <TextComponent
          component={component}
          handleComponentChange={handleComponentChange}
          className={classes.mainConfigWrapper}
        />
      );
    case ComponentType.CustomButton:
      return (
        <CustomButtonMainConfig
          component={component}
          handleComponentChange={handleComponentChange}
          className={classes.mainConfigWrapper}
        />
      );

    case ComponentType.ImageUpload:
      return (
        <ImageUploadComponent
          component={component}
          handleComponentChange={handleComponentChange}
          className={classes.mainConfigWrapper}
        />
      );

    default:
      return null;
  }
};
