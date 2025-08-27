import React from 'react';
import type { FormItem } from '@altinn/ux-editor/types/FormItem';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { EditSubformTableColumns } from '../../EditSubformTableColumns';

export type SubformMainConfigProps = {
  component: FormItem<ComponentType.Subform>;
  handleComponentChange: (component: FormItem) => void;
  className?: string;
};

export const SubformMainConfig = ({
  component,
  handleComponentChange,
  className,
}: SubformMainConfigProps): React.ReactNode => {
  return (
    <EditSubformTableColumns
      component={component}
      handleComponentChange={handleComponentChange}
      className={className}
    />
  );
};
