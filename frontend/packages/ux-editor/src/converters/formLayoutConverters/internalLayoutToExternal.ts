import type { IInternalLayout } from '../../types/global';
import type { ExternalComponent, ExternalFormLayout } from 'app-shared/types/api';
import { layoutSchemaUrl } from 'app-shared/cdn-paths';
import type { ExternalGroupComponent } from '../../types/ExternalGroupComponent';
import { internalGroupComponentToExternal } from '../groupComponentConverters';
import type { FormContainer } from '../../types/FormContainer';
import { addPageIndexPrefix } from './pageIndexUtils';
import { internalSimpleComponentToExternal } from '../simpleComponentConverters';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import type { CompareFunction } from 'app-shared/utils/compareFunctions';
import type { FormComponent } from '../../types/FormComponent';

export const internalLayoutToExternal = (internalLayout: IInternalLayout): ExternalFormLayout => ({
  $schema: layoutSchemaUrl(),
  data: {
    layout: generateExternalComponents(internalLayout),
    ...internalLayout.customDataProperties,
  },
  ...internalLayout.customRootProperties,
});

export const generateExternalComponents = (
  internalLayout: IInternalLayout,
): ExternalComponent[] => {
  const groupComponents = getGroupComponents(internalLayout);
  const simpleComponents = getSimpleComponents(internalLayout);
  const allComponents = [...groupComponents, ...simpleComponents];
  const allComponentIdsInOrder = getAllComponentIdsInOrder(internalLayout);
  return allComponents.sort(compareComponentsByPosition(allComponentIdsInOrder));
};

const getGroupComponents = (internalLayout: IInternalLayout): ExternalGroupComponent[] => {
  const convert = (container) => convertContainer(internalLayout, container);
  return findRelevantContainers(internalLayout).map(convert);
};

const findRelevantContainers = (internalLayout: IInternalLayout): FormContainer[] => {
  const predicate = (container) => container.id !== BASE_CONTAINER_ID;
  return Object.values(internalLayout.containers).filter(predicate);
};

const convertContainer = (
  internalLayout: IInternalLayout,
  container: FormContainer,
): ExternalGroupComponent => {
  const children = getGroupChildrenWithPageIndex(internalLayout, container);
  return internalGroupComponentToExternal(container, children);
};

const getGroupChildrenWithPageIndex = (
  internalLayout: IInternalLayout,
  container: FormContainer,
): string[] => {
  const childrenIds = internalLayout.order[container.id];
  return childrenIds.map((childId) => getComponentIdWithPageIndex(internalLayout, childId));
};

export const getComponentIdWithPageIndex = (
  internalLayout: IInternalLayout,
  componentId: string,
): string => {
  const component = getComponentById(internalLayout, componentId);

  const isUnknownComponentReference = component === undefined;
  if (isUnknownComponentReference) {
    // Returns the ID which is unknown component reference.
    return componentId;
  }
  return component.pageIndex === null
    ? componentId
    : addPageIndexPrefix(componentId, component.pageIndex);
};

const getComponentById = (
  internalLayout: IInternalLayout,
  componentId: string,
): FormComponent | FormContainer =>
  internalLayout.components[componentId] || internalLayout.containers[componentId];

const getSimpleComponents = (internalLayout: IInternalLayout): ExternalComponent[] =>
  Object.values(internalLayout.components).map(internalSimpleComponentToExternal);

/**
 * Returns a list of all component ids in the order in which they appear in the `order` property.
 * This is used to ensure that components within a group are ordered the same way with respect to each other in the final array.
 */
const getAllComponentIdsInOrder = (internalLayout: IInternalLayout): string[] => {
  const { order } = internalLayout;
  return Object.values(order).flat();
};

const compareComponentsByPosition =
  (idsInOrder: string[]): CompareFunction<ExternalComponent> =>
  (componentA: ExternalComponent, componentB: ExternalComponent) => {
    const indexA = idsInOrder.indexOf(componentA.id);
    const indexB = idsInOrder.indexOf(componentB.id);
    return indexA - indexB;
  };
