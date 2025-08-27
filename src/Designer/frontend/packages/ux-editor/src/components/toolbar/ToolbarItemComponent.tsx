import React from 'react';
import classes from './ToolbarItemComponent.module.css';
import type { ComponentType, CustomComponentType } from 'app-shared/types/ComponentType';
import { InformationPanelComponent } from './InformationPanelComponent';

export type ToolbarItemProvidedProps = {
  componentType: ComponentType | CustomComponentType;
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
