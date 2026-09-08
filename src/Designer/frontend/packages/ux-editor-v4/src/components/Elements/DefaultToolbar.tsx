import type { IToolbarElement } from '../../types/global';
import { CollapsibleMenus } from '../../types/global';
import { mapComponentToToolbarElement } from '../../utils/formLayoutUtils';
import classes from './DefaultToolbar.module.css';
import { useTranslation } from 'react-i18next';
import { schemaComponents, textComponents, advancedItems } from '../../data/formItemConfig';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { getCollapsibleMenuTitleByType } from '../../utils/language';
import { ToolbarItem } from './ToolbarItem';
import { useComponentTitle } from '@altinn/ux-editor-v4/hooks';
import { StudioDetails } from '@studio/components';

export const DefaultToolbar = () => {
  const { t } = useTranslation();
  const getComponentTitle = useComponentTitle();
  const componentList: IToolbarElement[] = schemaComponents.map(mapComponentToToolbarElement);
  const textComponentList: IToolbarElement[] = textComponents.map(mapComponentToToolbarElement);
  const advancedComponentsList: IToolbarElement[] = advancedItems.map(mapComponentToToolbarElement);

  const allComponentLists: KeyValuePairs<IToolbarElement[]> = {
    [CollapsibleMenus.Components]: componentList,
    [CollapsibleMenus.Texts]: textComponentList,
    [CollapsibleMenus.AdvancedComponents]: advancedComponentsList,
  };

  return Object.values(CollapsibleMenus).map((key: CollapsibleMenus) => {
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
              componentTitle={getComponentTitle(component)}
              icon={component.icon}
              componentType={component.type}
              key={component.type}
            />
          ))}
        </StudioDetails.Content>
      </StudioDetails>
    );
  });
};
