import React, { useState } from 'react';
import classes from './ToolbarItemComponent.module.css';
import { getComponentTitleByComponentType } from '../../utils/language';
import { useTranslation } from 'react-i18next';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { InformationPanelComponent } from './InformationPanelComponent';
import { shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';

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

  if (componentType == 'Summary2' && shouldDisplayFeature('summary2') === false) {
    return null;
  }

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
