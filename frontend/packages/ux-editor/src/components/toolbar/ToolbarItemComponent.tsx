import React, { useState } from 'react';
import classes from './ToolbarItemComponent.module.css';
import { getComponentTitleByComponentType } from '../../utils/language';
import { useTranslation } from 'react-i18next';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { InformationPanelComponent } from './InformationPanelComponent';

export type ToolbarItemProvidedProps = {
  componentType: ComponentType;
  thirdPartyLabel?: string;
  icon?: React.ComponentType;
};

export const ToolbarItemComponent = ({
  componentType,
  thirdPartyLabel,
  icon: Icon,
}: ToolbarItemProvidedProps): React.ReactElement => {
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
