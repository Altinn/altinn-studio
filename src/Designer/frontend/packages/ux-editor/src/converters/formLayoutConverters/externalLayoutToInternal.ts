import type {
  SerializedComponent,
  SerializedContainerComponent,
  SerializedFormLayout,
  SerializedLayoutData,
  SerializedSimpleComponent,
} from '../../types/SerializedComponent';
import type {
  IFormDesignerComponents,
  IFormDesignerContainers,
  IFormLayoutOrder,
  IInternalLayout,
  InternalLayoutComponents,
  InternalLayoutData,
} from '../../types/global';
import { externalSimpleComponentToInternal } from '../simpleComponentConverters';
import type { FormComponent } from '../../types/FormComponent';
import type { FormContainer } from '../../types/FormContainer';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { ObjectUtils } from '@studio/pure-functions';
import { externalContainerComponentToInternal } from '../containerComponentConverters';
import { findPageIndexInChildList, removePageIndexPrefix } from './pageIndexUtils';
import {
  createEmptyComponentStructure,
  createEmptyLayout,
  createEmptyLayoutData,
} from '../../utils/formLayoutUtils';
import { containerComponentTypes } from '../../data/containerComponentTypes';

export const externalLayoutToInternal = (
  externalLayout: SerializedFormLayout | null,
  layoutDefaultDataType?: string,
): IInternalLayout =>
  externalLayout
    ? convertExternalLayout(externalLayout, layoutDefaultDataType)
    : createEmptyLayout();

const convertExternalLayout = (
  externalLayout: SerializedFormLayout,
  layoutDefaultDataType?: string,
): IInternalLayout => {
  const customRootProperties = getCustomRootProperties(externalLayout);
  const { data } = externalLayout;
  const convertedData: InternalLayoutData = data
    ? convertExternalData(data, layoutDefaultDataType)
    : createEmptyLayoutData();
  return { ...convertedData, customRootProperties };
};

const getCustomRootProperties = (externalLayout: SerializedFormLayout) => {
  const customProperties = { ...externalLayout };
  delete customProperties.data;
  delete customProperties.$schema;
  return customProperties;
};

const convertExternalData = (
  externalData: SerializedLayoutData,
  layoutDefaultDataType?: string,
): InternalLayoutData => {
  const customDataProperties = getCustomDataProperties(externalData);
  const { layout, hidden } = externalData;
  const convertedComponents: InternalLayoutComponents = layout
    ? convertExternalComponentList(layout, layoutDefaultDataType)
    : createEmptyComponentStructure();
  return { ...convertedComponents, hidden, customDataProperties };
};

const getCustomDataProperties = (externalData: SerializedLayoutData) => {
  const customProperties = { ...externalData };
  delete customProperties.layout;
  delete customProperties.hidden;
  return customProperties;
};

const convertExternalComponentList = (
  externalComponents: SerializedComponent[],
  layoutDefaultDataType?: string,
): InternalLayoutComponents => ({
  components: getInternalComponents(externalComponents, layoutDefaultDataType),
  containers: getInternalContainers(externalComponents),
  order: getOrderOfComponents(externalComponents),
  pageIndexes: getPageIndexes(externalComponents),
});

const getInternalComponents = (
  externalComponents: SerializedComponent[],
  layoutDefaultDataType?: string,
): IFormDesignerComponents => {
  const convert = (component: SerializedSimpleComponent) =>
    externalSimpleComponentToInternal(component, layoutDefaultDataType);
  const components: FormComponent[] = findSimpleComponents(externalComponents).map(convert);
  return ObjectUtils.mapByProperty(components, 'id');
};

const getInternalContainers = (
  externalComponents: SerializedComponent[],
): IFormDesignerContainers => {
  const baseContainer: FormContainer = {
    id: BASE_CONTAINER_ID,
    index: 0,
    type: undefined,
  };
  const convertedContainers = getConvertedContainers(externalComponents);
  const containers: FormContainer[] = [baseContainer, ...convertedContainers];
  return ObjectUtils.mapByProperty(containers, 'id');
};

const getConvertedContainers = (externalComponents: SerializedComponent[]): FormContainer[] => {
  return findContainerComponents(externalComponents).map(externalContainerComponentToInternal);
};

const getOrderOfComponents = (externalComponents: SerializedComponent[]): IFormLayoutOrder => ({
  [BASE_CONTAINER_ID]: findTopLevelComponentIds(externalComponents),
  ...getChildrenIdsOfAllContainers(externalComponents),
});

const findContainerComponents = (
  externalComponents: SerializedComponent[],
): SerializedContainerComponent[] => externalComponents.filter(isContainer);

const isContainer = (component: SerializedComponent): component is SerializedContainerComponent =>
  containerComponentTypes.some((type) => type.toString() === component.type);

const findSimpleComponents = (
  externalComponents: SerializedComponent[],
): SerializedSimpleComponent[] => externalComponents.filter(isSimpleComponent);

const isSimpleComponent = (
  component: SerializedComponent,
): component is SerializedSimpleComponent => !isContainer(component);

const findTopLevelComponentIds = (externalComponents: SerializedComponent[]) =>
  externalComponents
    .filter((component) => findParent(externalComponents, component.id) === null)
    .map(({ id }) => id);

const getChildrenIdsOfAllContainers = (
  externalComponents: SerializedComponent[],
): IFormLayoutOrder => {
  const entries: [string, string[]][] = findContainerComponents(externalComponents).map(
    (container) => [container.id, getChildIds(container)],
  );
  return Object.fromEntries(entries);
};

const getPageIndexes = (externalComponents: SerializedComponent[]): Record<string, number> =>
  Object.fromEntries(
    externalComponents.flatMap((component) => {
      const pageIndex = findPageIndexOfComponent(externalComponents, component.id);
      return pageIndex === null ? [] : [[component.id, pageIndex]];
    }),
  );

const findParent = (
  externalComponents: SerializedComponent[],
  id: string,
): SerializedContainerComponent | null =>
  findContainerComponents(externalComponents).find((container) =>
    getChildIds(container).includes(id),
  ) ?? null;

const findPageIndexOfComponent = (
  externalComponents: SerializedComponent[],
  id: string,
): number | null => {
  const parentContainer = findParent(externalComponents, id);
  if (!isMultiPageContainer(parentContainer)) return null;
  return findPageIndexInChildList(id, parentContainer.children);
};

const isMultiPageContainer = (
  container: SerializedContainerComponent | null,
): container is Extract<SerializedContainerComponent, { type: 'RepeatingGroup' }> =>
  container?.type === 'RepeatingGroup' && container.edit?.multiPage === true;

const getChildIds = (container: SerializedContainerComponent) => {
  const children = container.children ?? [];
  return isMultiPageContainer(container) ? children.map(removePageIndexPrefix) : children;
};
