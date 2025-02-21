import React from 'react';
import { ComponentType } from 'app-shared/types/ComponentType';
import { SummaryMainConfig } from './SpecificMainConfig/SummaryMainConfig';
import { HeaderMainConfig } from './HeaderMainConfig';
import type { FormComponent } from '@altinn/ux-editor/types/FormComponent';
import type { FormContainer } from '@altinn/ux-editor/types/FormContainer';

export type ComponentMainConfigProps = {
  component: FormComponent | FormContainer;
  handleComponentChange: (component: FormComponent | FormContainer) => void;
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
      return (
        <HeaderMainConfig component={component} handleComponentChange={handleComponentChange} />
      );
  }
};
