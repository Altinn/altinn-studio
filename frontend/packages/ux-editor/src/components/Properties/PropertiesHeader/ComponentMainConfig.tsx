import React from 'react';
import { ComponentType } from 'app-shared/types/ComponentType';
import { SummaryMainConfig } from './SpecificMainConfig/SummaryMainConfig';
import type { FormItem } from '@altinn/ux-editor/types/FormItem';
import { SubformMainConfig } from './SpecificMainConfig/SubformMainConfig';
import { OptionsMainConfig } from './SpecificMainConfig/OptionsMainConfig';

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
        <SummaryMainConfig component={component} handleComponentChange={handleComponentChange} />
      );
    case ComponentType.Subform:
      return (
        <SubformMainConfig component={component} handleComponentChange={handleComponentChange} />
      );
    case ComponentType.Checkboxes:
    case ComponentType.RadioButtons:
    case ComponentType.Dropdown:
    case ComponentType.MultipleSelect:
    case ComponentType.Likert:
      return (
        <OptionsMainConfig component={component} handleComponentChange={handleComponentChange} />
      );
    default:
      return null;
  }
};
