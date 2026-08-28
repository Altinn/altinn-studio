import React from 'react';
import classes from './ToolbarItemComponent.module.css';
import type { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import type { ComponentPreset } from '@altinn/ux-editor/types/ComponentPreset';
import { InformationPanelComponent } from './InformationPanelComponent';

export type ToolbarItemProvidedProps = {
  componentType: ComponentType | ComponentPreset;
  componentTitle: string;
  icon?: React.ComponentType;
};

export const ToolbarItemComponent = ({
  componentType,
  componentTitle,
  icon: Icon,
}: ToolbarItemProvidedProps): React.ReactElement => {
  return (
    <div className={classes.toolbarItem}>
      <div className={classes.componentIcon}>{Icon && <Icon />}</div>
      <div className={classes.componentLabel}>{componentTitle}</div>
      <div className={classes.componentHelpIcon}>
        <InformationPanelComponent componentTitle={componentTitle} componentType={componentType} />
      </div>
    </div>
  );
};
