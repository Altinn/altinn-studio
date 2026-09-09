import type { IToolbarElement } from '../../types/global';
import { CollapsibleMenus } from '../../types/global';
import { mapComponentToToolbarElement } from '../../utils/formLayoutUtils';
import classes from './DefaultToolbar.module.css';
import { useTranslation } from 'react-i18next';
import { schemaComponents, textComponents, advancedItems } from '../../data/formItemConfig';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { StudioDetails } from '@studio/components';
import {
  getCollapsibleMenuTitleByType,
  getComponentTitleByComponentType,
} from '../../utils/language';
import { ToolbarItem } from './ToolbarItem';

export function DefaultToolbar() {
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
    [CollapsibleMenus.Components]: componentList,
    [CollapsibleMenus.Texts]: textComponentList,
    [CollapsibleMenus.AdvancedComponents]: advancedComponentsList,
    // TODO: Uncomment when widgets are implemented
    // [CollapsibleMenus.Widgets]: widgetComponentsList,
    // [CollapsibleMenus.ThirdParty]: thirdPartyComponentList,
  };

  return (
    <>
      {Object.values(CollapsibleMenus).map((key: CollapsibleMenus) => {
        return (
          <StudioDetails
            key={key}
            defaultOpen={key === CollapsibleMenus.Components}
            className={classes.detailsElement}
          >
            <StudioDetails.Summary>{getCollapsibleMenuTitleByType(key, t)}</StudioDetails.Summary>
            <StudioDetails.Content className={classes.detailsContent}>
              {allComponentLists[key].map((component: IToolbarElement) => (
                <ToolbarItem
                  text={getComponentTitleByComponentType(component.type, t) || component.label}
                  icon={component.icon}
                  componentType={component.type}
                  key={component.type}
                />
              ))}
            </StudioDetails.Content>
          </StudioDetails>
        );
      })}
    </>
  );
}
