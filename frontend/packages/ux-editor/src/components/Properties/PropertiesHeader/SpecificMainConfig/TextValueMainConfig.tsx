import type { FormItem } from '@altinn/ux-editor/types/FormItem';
import type { ComponentType } from 'app-shared/types/ComponentType';
import React from 'react';

export type TextValueMainConfigProps = {
  component: FormItem<ComponentType.Text>;
  handleComponentChange: (component: FormItem<ComponentType.Text>) => void;
};
export const TextValueMainConfig = () => {
  return (
    <div>
      <p>This is the TextMainConfig component.</p>
      {/* Add your specific text main configuration logic here */}
    </div>
  );
};
