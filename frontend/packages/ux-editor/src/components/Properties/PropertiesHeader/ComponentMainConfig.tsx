import React from 'react';
import type { FormItem } from '../../../types/FormItem';
import { ComponentType } from 'app-shared/types/ComponentType';
import { SummaryMainConfig } from './SpecificMainConfig/SummaryMainConfig';
import { HeaderMainConfig } from './HeaderMainConfig';

export type ComponentMainConfigProps = {
  component: FormItem;
  handleComponentChange: (component: FormItem) => void;
};

export const ComponentMainConfig = ({
  component,
  handleComponentChange,
}: ComponentMainConfigProps) => {
  if (component.type !== ComponentType.Summary2) return <HeaderMainConfig />;

  return (
    <>
      {component.type === ComponentType.Summary2 && (
        <SummaryMainConfig component={component} handleComponentChange={handleComponentChange} />
      )}
    </>
  );
};
