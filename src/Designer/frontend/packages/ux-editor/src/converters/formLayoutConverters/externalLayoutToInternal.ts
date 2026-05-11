import type { ExternalComponent, ExternalData, ExternalFormLayout } from 'app-shared/types/api';
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
import type { ExternalContainerComponent } from '../../types/ExternalContainerComponent';
import type { ExternalSimpleComponent } from '../../types/ExternalSimpleComponent';
import { externalContainerComponentToInternal } from '../containerComponentConverters';
import { findPageIndexInChildList, removePageIndexPrefix } from './pageIndexUtils';
import {
  createEmptyComponentStructure,
  createEmptyLayout,
  createEmptyLayoutData,
} from '../../utils/formLayoutUtils';
import { containerComponentTypes } from '../../data/containerComponentTypes';

export const externalLayoutToInternal = (
  externalLayout: ExternalFormLayout | null,
  layoutDefaultDataType?: string,
): IInternalLayout =>
  externalLayout
    ? convertExternalLayout(externalLayout, layoutDefaultDataType)
    : createEmptyLayout();

const convertExternalLayout = (
  externalLayout: ExternalFormLayout,
  layoutDefaultDataType?: string,
): IInternalLayout => {
  const customRootProperties = getCustomRootProperties(externalLayout);
  const { data } = externalLayout;
  const convertedData: InternalLayoutData = data
    ? convertExternalData(data, layoutDefaultDataType)
    : createEmptyLayoutData();
  return { ...convertedData, customRootProperties };
};

const getCustomRootProperties = (externalLayout: ExternalFormLayout) => {
  const customProperties = { ...externalLayout };
  delete customProperties.data;
  delete customProperties.$schema;
  return customProperties;
};

const convertExternalData = (
  externalData: ExternalData,
  layoutDefaultDataType?: string,
): InternalLayoutData => {
  const customDataProperties = getCustomDataProperties(externalData);
  const { layout, hidden } = externalData;
  const convertedComponents: InternalLayoutComponents = layout
    ? convertExternalComponentList(layout, layoutDefaultDataType)
    : createEmptyComponentStructure();
  return { ...convertedComponents, hidden, customDataProperties };
};

const getCustomDataProperties = (externalData: ExternalData) => {
  const customProperties = { ...externalData };
  delete customProperties.layout;
  delete customProperties.hidden;
  return customProperties;
};

const convertExternalComponentList = (
  externalComponents: ExternalComponent[],
  layoutDefaultDataType?: string,
): InternalLayoutComponents => ({
  components: getInternalComponents(externalComponents, layoutDefaultDataType),
  containers: getInternalContainers(externalComponents),
  order: getOrderOfComponents(externalComponents),
});

const getInternalComponents = (
  externalComponents: ExternalComponent[],
  layoutDefaultDataType?: string,
): IFormDesignerComponents => {
  const convert = (component: ExternalSimpleComponent) =>
    convertSimpleComponent(externalComponents, component, layoutDefaultDataType);
  const components: FormComponent[] = findSimpleComponents(externalComponents).map(convert);
  return ObjectUtils.mapByProperty(components, 'id');
};

const getInternalContainers = (
  externalComponents: ExternalComponent[],
): IFormDesignerContainers => {
  const baseContainer: FormContainer = {
    id: BASE_CONTAINER_ID,
    index: 0,
    itemType: 'CONTAINER',
    type: undefined,
    pageIndex: null,
  };
  const convertedContainers = getConvertedContainers(externalComponents);
  const containers: FormContainer[] = [baseContainer, ...convertedContainers];
  return ObjectUtils.mapByProperty(containers, 'id');
};

const getConvertedContainers = (externalComponents: ExternalComponent[]): FormContainer[] => {
  const convert = (component) => convertContainerComponent(externalComponents, component);
  return findContainerComponents(externalComponents).map(convert);
};

const getOrderOfComponents = (externalComponents: ExternalComponent[]): IFormLayoutOrder => ({
  [BASE_CONTAINER_ID]: findTopLevelComponentIds(externalComponents),
  ...getChildrenIdsOfAllContainers(externalComponents),
});

const findContainerComponents = (
  externalComponents: ExternalComponent[],
): ExternalContainerComponent[] => externalComponents.filter(isContainer);

const isContainer = (component: ExternalComponent): component is ExternalContainerComponent =>
  containerComponentTypes.includes(component.type);

const findSimpleComponents = (externalComponents: ExternalComponent[]): ExternalSimpleComponent[] =>
  externalComponents.filter(isSimpleComponent);

const isSimpleComponent = (component: ExternalComponent): component is ExternalSimpleComponent =>
  !isContainer(component);

const findTopLevelComponentIds = (externalComponents: ExternalComponent[]) =>
  externalComponents
    .filter((component) => findParent(externalComponents, component.id) === null)
    .map(({ id }) => id);

const getChildrenIdsOfAllContainers = (
  externalComponents: ExternalComponent[],
): IFormLayoutOrder => {
  const entries: [string, string[]][] = findContainerComponents(externalComponents).map(
    (container) => [container.id, getChildIds(container)],
  );
  return Object.fromEntries(entries);
};

const convertSimpleComponent = (
  externalComponentList: ExternalComponent[],
  externalComponent: ExternalSimpleComponent,
  layoutDefaultDataType?: string,
): FormComponent => {
  const pageIndex = findPageIndexOfComponent(externalComponentList, externalComponent.id);
  return externalSimpleComponentToInternal(externalComponent, pageIndex, layoutDefaultDataType);
};

const convertContainerComponent = (
  externalComponentList: ExternalComponent[],
  externalComponent: ExternalContainerComponent,
): FormContainer => {
  const pageIndex = findPageIndexOfComponent(externalComponentList, externalComponent.id);
  return externalContainerComponentToInternal(externalComponent, pageIndex);
};

const findParent = (
  externalComponents: ExternalComponent[],
  id: string,
): ExternalContainerComponent | null =>
  findContainerComponents(externalComponents).find((container) =>
    getChildIds(container).includes(id),
  ) ?? null;

const findPageIndexOfComponent = (
  externalComponents: ExternalComponent[],
  id: string,
): number | null => {
  const parentContainer = findParent(externalComponents, id);
  if (!parentContainer?.edit?.multiPage) return null;
  return findPageIndexInChildList(id, parentContainer.children);
};

const getChildIds = ({ edit, children = [] }: ExternalContainerComponent) =>
  edit?.multiPage ? children.map(removePageIndexPrefix) : children;
