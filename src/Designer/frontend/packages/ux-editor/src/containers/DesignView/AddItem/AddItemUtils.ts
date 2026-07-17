import { BASE_CONTAINER_ID } from 'app-shared/constants';
import type { ComponentType, CustomComponentType } from 'app-shared/types/ComponentType';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { ArrayUtils } from '@studio/pure-functions';
import type { IInternalLayout, IToolbarElement } from '../../../types/global';
import { allComponents, defaultComponents, formItemConfigs } from '../../../data/formItemConfig';
import { mapComponentToToolbarElement } from '../../../utils/formLayoutUtils';
import { ElementsUtils } from '../../../components/Elements/ElementsUtils';
import type { ConfPageType } from '../../../components/Elements/types/ConfigPageType';

type AddableComponentType = ComponentType | CustomComponentType;

const OTHER_COMPONENT_CATEGORY = 'other';

const categorizedComponentTypes: ComponentType[] = Object.values(allComponents).flat();

type ComponentSelection = {
  quickAddComponents: IToolbarElement[];
  availableComponents: KeyValuePairs<IToolbarElement[]>;
  shouldShowAllComponentsButton: boolean;
};

export const getComponentSelection = (
  layout: IInternalLayout,
  containerId: string,
  configurationMode?: ConfPageType,
): ComponentSelection => {
  const allowedComponentTypes = ElementsUtils.getAllowedComponentTypes(configurationMode);
  const quickAddComponents = getQuickAddComponents(layout, containerId, allowedComponentTypes);
  const availableComponents = getAvailableComponents(layout, containerId, allowedComponentTypes);
  const availableComponentCount = Object.values(availableComponents).flat().length;

  return {
    quickAddComponents,
    availableComponents,
    shouldShowAllComponentsButton: availableComponentCount > quickAddComponents.length,
  };
};

const getQuickAddComponents = (
  layout: IInternalLayout,
  containerId: string,
  allowedComponentTypes?: AddableComponentType[],
): IToolbarElement[] => {
  const componentTypes = getDefaultComponentTypesForContainer(
    layout,
    containerId,
    allowedComponentTypes,
  );
  return componentTypes.map((element) => mapComponentToToolbarElement(formItemConfigs[element]));
};

const getAvailableComponents = (
  layout: IInternalLayout,
  containerId: string,
  allowedComponentTypes?: AddableComponentType[],
): KeyValuePairs<IToolbarElement[]> => {
  const allComponentLists: KeyValuePairs<IToolbarElement[]> = {};
  const validChildTypes = getContainerValidChildTypes(layout, containerId);
  const componentsByCategory: KeyValuePairs<AddableComponentType[]> = {
    ...allComponents,
    ...getUncategorizedAllowedComponents(allowedComponentTypes),
  };

  Object.keys(componentsByCategory).forEach((key) => {
    const componentListForKey = componentsByCategory[key]
      .filter((element) =>
        isComponentAllowedInContainer(element, containerId, validChildTypes, allowedComponentTypes),
      )
      .map((element) => mapComponentToToolbarElement(formItemConfigs[element]));

    if (componentListForKey.length > 0) {
      allComponentLists[key] = componentListForKey;
    }
  });
  return allComponentLists;
};

const isComponentAllowedInContainer = (
  componentType: AddableComponentType,
  containerId: string,
  validChildTypes: ComponentType[] | undefined,
  allowedComponentTypes?: AddableComponentType[],
): boolean => {
  if (
    containerId !== BASE_CONTAINER_ID &&
    !validChildTypes?.includes(componentType as ComponentType)
  ) {
    return false;
  }
  if (allowedComponentTypes && !allowedComponentTypes.includes(componentType)) {
    return false;
  }
  return true;
};

const getUncategorizedAllowedComponents = (
  allowedComponentTypes?: AddableComponentType[],
): KeyValuePairs<AddableComponentType[]> => {
  if (!allowedComponentTypes) return {};
  const uncategorized = ArrayUtils.intersection(
    allowedComponentTypes,
    categorizedComponentTypes,
    false,
  );
  return uncategorized.length > 0 ? { [OTHER_COMPONENT_CATEGORY]: uncategorized } : {};
};

const getDefaultComponentTypesForContainer = (
  layout: IInternalLayout,
  containerId: string,
  allowedComponentTypes?: AddableComponentType[],
): AddableComponentType[] => {
  const validChildTypes = getContainerValidChildTypes(layout, containerId);

  if (allowedComponentTypes) {
    const allowedInContainer = validChildTypes
      ? allowedComponentTypes.filter((element) =>
          validChildTypes.includes(element as ComponentType),
        )
      : allowedComponentTypes;
    return capToDefaultComponentAmount(prioritizeDefaultComponents(allowedInContainer));
  }

  if (validChildTypes && validChildTypes.length <= defaultComponents.length) {
    return validChildTypes;
  }
  return defaultComponents;
};

const prioritizeDefaultComponents = (
  componentTypes: AddableComponentType[],
): AddableComponentType[] => {
  const isDefault = (type: AddableComponentType): boolean =>
    defaultComponents.includes(type as ComponentType);
  return [
    ...componentTypes.filter(isDefault),
    ...componentTypes.filter((type) => !isDefault(type)),
  ];
};

const capToDefaultComponentAmount = (
  componentTypes: AddableComponentType[],
): AddableComponentType[] => componentTypes.slice(0, defaultComponents.length);

const getContainerValidChildTypes = (
  layout: IInternalLayout,
  containerId: string,
): ComponentType[] | undefined => {
  if (containerId === BASE_CONTAINER_ID) return undefined;
  return formItemConfigs[layout.containers[containerId].type]?.validChildTypes;
};
