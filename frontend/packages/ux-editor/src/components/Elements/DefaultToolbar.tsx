import React, { useState } from 'react';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { CollapsableMenus, type IToolbarElement } from '../../types/global';
import { InformationPanelComponent } from '../toolbar/InformationPanelComponent';
import { mapComponentToToolbarElement } from '../../utils/formLayoutUtils';
import './DefaultToolbar.css';
import classes from './DefaultToolbar.module.css';
import { useTranslation } from 'react-i18next';
import { schemaComponents, textComponents, advancedItems } from '../../data/formItemConfig';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { Accordion } from '@digdir/design-system-react';
import { ToolbarItem } from './ToolbarItem';
import {
  getComponentTitleByComponentType,
  getCollapsableMenuTitleByType,
} from '../../utils/language';

export function DefaultToolbar() {
  const [compInfoPanelOpen, setCompInfoPanelOpen] = useState<boolean>(false);
  const [compSelForInfoPanel, setCompSelForInfoPanel] = useState<ComponentType>(null);
  const [anchorElement, setAnchorElement] = useState<any>(null);

  const { t } = useTranslation();

  const componentList: IToolbarElement[] = schemaComponents.map(mapComponentToToolbarElement);
  const textComponentList: IToolbarElement[] = textComponents.map(mapComponentToToolbarElement);
  const advancedComponentsList: IToolbarElement[] = advancedItems.map(mapComponentToToolbarElement);

  const allComponentLists: KeyValuePairs<IToolbarElement[]> = {
    [CollapsableMenus.Components]: componentList,
    [CollapsableMenus.Texts]: textComponentList,
    [CollapsableMenus.AdvancedComponents]: advancedComponentsList,
  };

  const handleComponentInformationOpen = (component: ComponentType, event: any) => {
    setCompInfoPanelOpen(true);
    setCompSelForInfoPanel(component);
    setAnchorElement(event.currentTarget);
  };

  const handleComponentInformationClose = () => {
    setCompInfoPanelOpen(false);
    setCompSelForInfoPanel(null);
    setAnchorElement(null);
  };

  return (
    <>
      {Object.values(CollapsableMenus).map((key: CollapsableMenus) => {
        return (
          <Accordion key={key} color='subtle'>
            <Accordion.Item
              defaultOpen={key === CollapsableMenus.Components}
              className={classes.accordionItem}
            >
              <Accordion.Header className={classes.accordionHeader}>
                {getCollapsableMenuTitleByType(key, t)}
              </Accordion.Header>
              <Accordion.Content className={classes.accordionContent}>
                {allComponentLists[key].map((component: IToolbarElement) => (
                  <ToolbarItem
                    text={getComponentTitleByComponentType(component.type, t) || component.label}
                    icon={component.icon}
                    componentType={component.type}
                    onClick={handleComponentInformationOpen}
                    key={component.type}
                  />
                ))}
              </Accordion.Content>
            </Accordion.Item>
          </Accordion>
        );
      })}
      <InformationPanelComponent
        anchorElement={anchorElement}
        informationPanelOpen={compInfoPanelOpen}
        onClose={handleComponentInformationClose}
        selectedComponent={compSelForInfoPanel}
      />
    </>
  );
}
