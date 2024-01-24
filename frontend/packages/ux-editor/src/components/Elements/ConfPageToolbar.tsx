import React, { useState } from 'react';
import type { ComponentType } from 'app-shared/types/ComponentType';
import type { IToolbarElement } from '../../types/global';
import { InformationPanelComponent } from '../toolbar/InformationPanelComponent';
import { ToolbarItem } from './ToolbarItem';
import { confOnScreenComponents } from '../../data/formItemConfig';
import { getComponentTitleByComponentType } from '../../utils/language';
import { mapComponentToToolbarElement } from '../../utils/formLayoutUtils';
import { useTranslation } from 'react-i18next';

export const ConfPageToolbar = () => {
  const [anchorElement, setAnchorElement] = useState<any>(null);
  const [compSelForInfoPanel, setCompSelForInfoPanel] = useState<ComponentType>(null);
  const { t } = useTranslation();
  const componentList: IToolbarElement[] = confOnScreenComponents.map(mapComponentToToolbarElement);
  const handleComponentInformationOpen = (component: ComponentType, event: any) => {
    setCompSelForInfoPanel(component);
    setAnchorElement(event.currentTarget);
  };

  const handleComponentInformationClose = () => {
    setCompSelForInfoPanel(null);
    setAnchorElement(null);
  };
  return (
    <>
      {componentList.map((component: IToolbarElement) => (
        <ToolbarItem
          text={getComponentTitleByComponentType(component.type, t) || component.label}
          icon={component.icon}
          componentType={component.type}
          onClick={handleComponentInformationOpen}
          key={component.type}
        />
      ))}
      <InformationPanelComponent
        anchorElement={anchorElement}
        informationPanelOpen={Boolean(anchorElement)}
        onClose={handleComponentInformationClose}
        selectedComponent={compSelForInfoPanel}
      />
    </>
  );
};
