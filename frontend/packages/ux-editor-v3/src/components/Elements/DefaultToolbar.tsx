import React, { useState } from 'react';
import type { ComponentType } from 'app-shared/types/ComponentType';
import type { IToolbarElement } from '../../types/global';
import { CollapsableMenus } from '../../types/global';
import { InformationPanelComponent } from '../toolbar/InformationPanelComponent';
import { mapComponentToToolbarElement } from '../../utils/formLayoutUtils';
import './DefaultToolbar.css';
import classes from './DefaultToolbar.module.css';
import { useTranslation } from 'react-i18next';
import { schemaComponents, textComponents, advancedItems } from '../../data/formItemConfig';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { Accordion } from '@digdir/design-system-react';
import { getCollapsableMenuTitleByType } from '../../utils/language';
import { ToolbarItem } from './ToolbarItem';
import { getComponentTitleByComponentType } from '../../utils/language';

export function DefaultToolbar() {
  const [compInfoPanelOpen, setCompInfoPanelOpen] = useState<boolean>(false);
  const [compSelForInfoPanel, setCompSelForInfoPanel] = useState<ComponentType>(null);
  const [anchorElement, setAnchorElement] = useState<any>(null);

  const { t } = useTranslation();
  // TODO: Uncomment when widgets are implemented
  // const { org, app } = useParams();
  // const { data: widgetsList } = useWidgetsQuery(org, app);

  const componentList: IToolbarElement[] = schemaComponents.map(mapComponentToToolbarElement);
  const textComponentList: IToolbarElement[] = textComponents.map(mapComponentToToolbarElement);
  const advancedComponentsList: IToolbarElement[] = advancedItems.map(mapComponentToToolbarElement);
  // TODO: Uncomment when widgets are implemented
  // const widgetComponentsList: IToolbarElement[] = widgetsList.map(
  //   (widget) => mapWidgetToToolbarElement(widget, t)
  // );

  const allComponentLists: KeyValuePairs<IToolbarElement[]> = {
    [CollapsableMenus.Components]: componentList,
    [CollapsableMenus.Texts]: textComponentList,
    [CollapsableMenus.AdvancedComponents]: advancedComponentsList,
    // TODO: Uncomment when widgets are implemented
    // [CollapsableMenus.Widgets]: widgetComponentsList,
    // [CollapsableMenus.ThirdParty]: thirdPartyComponentList,
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
