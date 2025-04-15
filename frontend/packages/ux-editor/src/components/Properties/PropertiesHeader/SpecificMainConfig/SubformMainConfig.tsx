import React from 'react';
import type { FormItem } from '@altinn/ux-editor/types/FormItem';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { EditSubformTableColumns } from '../../EditSubformTableColumns';
import classes from './SpecificMainConfig.module.css';

export type SubformMainConfigProps = {
  component: FormItem<ComponentType.Subform>;
  handleComponentChange: (component: FormItem) => void;
};

export const SubformMainConfig = ({
  component,
  handleComponentChange,
}: SubformMainConfigProps): React.ReactNode => {
  return (
    <EditSubformTableColumns
      component={component}
      handleComponentChange={handleComponentChange}
      mainConfigClass={classes.mainConfigWrapper}
    />
  );
};
