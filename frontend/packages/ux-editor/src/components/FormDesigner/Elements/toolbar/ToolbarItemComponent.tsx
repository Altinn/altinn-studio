import React, { useState } from 'react';
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
  const [compInfoPanelOpen, setCompInfoPanelOpen] = useState<boolean>(false);

  const handleComponentInformationToggle = () => {
    setCompInfoPanelOpen((prevState) => !prevState);
  };

  return (
    <div className={classes.toolbarItem}>
      <div className={classes.componentIcon}>{Icon && <Icon />}</div>
      <div className={classes.componentLabel}>{componentTitle}</div>
      <div className={classes.componentHelpIcon}>
        <InformationPanelComponent
          isOpen={compInfoPanelOpen}
          onOpen={handleComponentInformationToggle}
          onClose={handleComponentInformationToggle}
          componentTitle={componentTitle}
          componentType={componentType}
        />
      </div>
    </div>
  );
};
