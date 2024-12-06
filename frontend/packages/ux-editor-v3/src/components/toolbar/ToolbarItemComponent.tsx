import React, { useState } from 'react';
import classes from './ToolbarItemComponent.module.css';
import { getComponentTitleByComponentType } from '../../utils/language';
import { useTranslation } from 'react-i18next';
import type { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import { InformationPanelComponent } from './InformationPanelComponent';

export type ToolbarItemProvidedProps = {
  componentType: ComponentTypeV3;
  thirdPartyLabel?: string;
  icon?: string | React.ComponentType;
};

export const ToolbarItemComponent = ({
  componentType,
  thirdPartyLabel,
  icon: Icon,
}: ToolbarItemProvidedProps) => {
  const { t } = useTranslation();

  const [compInfoPanelOpen, setCompInfoPanelOpen] = useState<boolean>(false);

  const handleComponentInformationToggle = () => {
    setCompInfoPanelOpen((prevState) => !prevState);
  };

  return (
    <div className={classes.toolbarItem}>
      <div className={classes.componentIcon}>{Icon && <Icon />}</div>
      <div className={classes.componentLabel}>
        {thirdPartyLabel == null
          ? getComponentTitleByComponentType(componentType, t)
          : thirdPartyLabel}
      </div>
      <div className={classes.componentHelpIcon}>
        <InformationPanelComponent
          isOpen={compInfoPanelOpen}
          onOpen={handleComponentInformationToggle}
          onClose={handleComponentInformationToggle}
          selectedComponent={componentType}
        />
      </div>
    </div>
  );
};
