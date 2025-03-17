import React from 'react';
import type { FormItem } from '../../../types/FormItem';
import { ComponentType } from 'app-shared/types/ComponentType';
import { SummaryMainConfig } from './SpecificMainConfig/SummaryMainConfig';

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
    default:
      return null;
  }
};
