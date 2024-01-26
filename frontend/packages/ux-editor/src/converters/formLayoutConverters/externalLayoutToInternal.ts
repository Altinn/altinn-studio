import type { ExternalComponent, ExternalData, ExternalFormLayout } from 'app-shared/types/api';
import type {
  IFormDesignerComponents,
  IFormDesignerContainers,
  IFormLayoutOrder,
  IInternalLayout,
  InternalLayoutComponents,
  InternalLayoutData,
} from '../../types/global';
import { ComponentType } from 'app-shared/types/ComponentType';
import { externalSimpleComponentToInternal } from '../simpleComponentConverters';
import type { FormComponent } from '../../types/FormComponent';
import type { FormContainer } from '../../types/FormContainer';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { mapByProperty } from 'app-shared/utils/objectUtils';
import type { ExternalGroupComponent } from '../../types/ExternalGroupComponent';
import type { ExternalSimpleComponent } from '../../types/ExternalSimpleComponent';
import { externalGroupComponentToInternal } from '../groupComponentConverters';
import { findPageIndexInChildList, removePageIndexPrefix } from './pageIndexUtils';
import {
  createEmptyComponentStructure,
  createEmptyLayout,
  createEmptyLayoutData,
} from '../../utils/formLayoutUtils';

export const externalLayoutToInternal = (
  externalLayout: ExternalFormLayout | null,
): IInternalLayout =>
  externalLayout ? convertExternalLayout(externalLayout) : createEmptyLayout();

const convertExternalLayout = (externalLayout: ExternalFormLayout): IInternalLayout => {
  const customRootProperties = getCustomRootProperties(externalLayout);
  const { data } = externalLayout;
  const convertedData: InternalLayoutData = data
    ? convertExternalData(data)
    : createEmptyLayoutData();
  return { ...convertedData, customRootProperties };
};

const getCustomRootProperties = (externalLayout: ExternalFormLayout) => {
  const customProperties = { ...externalLayout };
  delete customProperties.data;
  delete customProperties.$schema;
  return customProperties;
};

const convertExternalData = (externalData: ExternalData): InternalLayoutData => {
  const customDataProperties = getCustomDataProperties(externalData);
  const { layout } = externalData;
  const convertedComponents: InternalLayoutComponents = layout
    ? convertExternalComponentList(layout)
    : createEmptyComponentStructure();
  return { ...convertedComponents, customDataProperties };
};

const getCustomDataProperties = (externalData: ExternalData) => {
  const customProperties = { ...externalData };
  delete customProperties.layout;
  return customProperties;
};

const convertExternalComponentList = (
  externalComponents: ExternalComponent[],
): InternalLayoutComponents => ({
  components: getInternalComponents(externalComponents),
  containers: getInternalContainers(externalComponents),
  order: getOrderOfComponents(externalComponents),
});

const getInternalComponents = (
  externalComponents: ExternalComponent[],
): IFormDesignerComponents => {
  const convert = (component) => convertSimpleComponent(externalComponents, component);
  const components: FormComponent[] = findSimpleComponents(externalComponents).map(convert);
  return mapByProperty(components, 'id');
};

const getInternalContainers = (
  externalComponents: ExternalComponent[],
): IFormDesignerContainers => {
  const baseContainer: FormContainer = {
    id: BASE_CONTAINER_ID,
    index: 0,
    itemType: 'CONTAINER',
    pageIndex: null,
  };
  const convertedContainers = getConvertedContainers(externalComponents);
  const containers: FormContainer[] = [baseContainer, ...convertedContainers];
  return mapByProperty(containers, 'id');
};

const getConvertedContainers = (externalComponents: ExternalComponent[]): FormContainer[] => {
  const convert = (component) => convertGroupComponent(externalComponents, component);
  return findGroupComponents(externalComponents).map(convert);
};

const getOrderOfComponents = (externalComponents: ExternalComponent[]): IFormLayoutOrder => ({
  [BASE_CONTAINER_ID]: findTopLevelComponentIds(externalComponents),
  ...getChildrenIdsOfAllContainers(externalComponents),
});

const findSimpleComponents = (externalComponents: ExternalComponent[]): ExternalSimpleComponent[] =>
  externalComponents.filter(
    (component) => component.type !== ComponentType.Group,
  ) as ExternalSimpleComponent[];

const findGroupComponents = (externalComponents: ExternalComponent[]): ExternalGroupComponent[] =>
  externalComponents.filter(
    (component) => component.type === ComponentType.Group,
  ) as ExternalGroupComponent[];

const findTopLevelComponentIds = (externalComponents: ExternalComponent[]) =>
  externalComponents
    .filter((component) => findParent(externalComponents, component.id) === null)
    .map(({ id }) => id);

const getChildrenIdsOfAllContainers = (
  externalComponents: ExternalComponent[],
): IFormLayoutOrder => {
  const entries: [string, string[]][] = findGroupComponents(externalComponents).map((container) => [
    container.id,
    getChildIds(container),
  ]);
  return Object.fromEntries(entries);
};

const convertSimpleComponent = (
  externalComponentList: ExternalComponent[],
  externalComponent: ExternalSimpleComponent,
): FormComponent => {
  const pageIndex = findPageIndexOfComponent(externalComponentList, externalComponent.id);
  return externalSimpleComponentToInternal(externalComponent, pageIndex);
};

const convertGroupComponent = (
  externalComponentList: ExternalComponent[],
  externalComponent: ExternalGroupComponent,
): FormContainer => {
  const pageIndex = findPageIndexOfComponent(externalComponentList, externalComponent.id);
  return externalGroupComponentToInternal(externalComponent, pageIndex);
};

const findParent = (
  externalComponents: ExternalComponent[],
  id: string,
): ExternalGroupComponent | null =>
  findGroupComponents(externalComponents).find((container) =>
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

const getChildIds = ({ edit, children = [] }: ExternalGroupComponent) =>
  edit?.multiPage ? children.map(removePageIndexPrefix) : children;
