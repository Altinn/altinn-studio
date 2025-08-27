import type {
  ExternalComponentV3,
  ExternalDataV3,
  ExternalFormLayoutV3,
} from 'app-shared/types/api';
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
import { ObjectUtils } from 'libs/studio-pure-functions/src';
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
  externalLayout: ExternalFormLayoutV3 | null,
): IInternalLayout =>
  externalLayout ? convertExternalLayout(externalLayout) : createEmptyLayout();

const convertExternalLayout = (externalLayout: ExternalFormLayoutV3): IInternalLayout => {
  const customRootProperties = getCustomRootProperties(externalLayout);
  const { data } = externalLayout;
  const convertedData: InternalLayoutData = data
    ? convertExternalData(data)
    : createEmptyLayoutData();
  return { ...convertedData, customRootProperties };
};

const getCustomRootProperties = (externalLayout: ExternalFormLayoutV3) => {
  const customProperties = { ...externalLayout };
  delete customProperties.data;
  delete customProperties.$schema;
  return customProperties;
};

const convertExternalData = (externalData: ExternalDataV3): InternalLayoutData => {
  const customDataProperties = getCustomDataProperties(externalData);
  const { layout } = externalData;
  const convertedComponents: InternalLayoutComponents = layout
    ? convertExternalComponentList(layout)
    : createEmptyComponentStructure();
  return { ...convertedComponents, customDataProperties };
};

const getCustomDataProperties = (externalData: ExternalDataV3) => {
  const customProperties = { ...externalData };
  delete customProperties.layout;
  return customProperties;
};

const convertExternalComponentList = (
  externalComponents: ExternalComponentV3[],
): InternalLayoutComponents => ({
  components: getInternalComponents(externalComponents),
  containers: getInternalContainers(externalComponents),
  order: getOrderOfComponents(externalComponents),
});

const getInternalComponents = (
  externalComponents: ExternalComponentV3[],
): IFormDesignerComponents => {
  const convert = (component: ExternalSimpleComponent) =>
    convertSimpleComponent(externalComponents, component);
  const components: FormComponent[] = findSimpleComponents(externalComponents).map(convert);
  return ObjectUtils.mapByProperty(components, 'id');
};

const getInternalContainers = (
  externalComponents: ExternalComponentV3[],
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

const getConvertedContainers = (externalComponents: ExternalComponentV3[]): FormContainer[] => {
  const convert = (component) => convertContainerComponent(externalComponents, component);
  return findContainerComponents(externalComponents).map(convert);
};

const getOrderOfComponents = (externalComponents: ExternalComponentV3[]): IFormLayoutOrder => ({
  [BASE_CONTAINER_ID]: findTopLevelComponentIds(externalComponents),
  ...getChildrenIdsOfAllContainers(externalComponents),
});

const findContainerComponents = (
  externalComponents: ExternalComponentV3[],
): ExternalContainerComponent[] => externalComponents.filter(isContainer);

const isContainer = (component: ExternalComponentV3): component is ExternalContainerComponent =>
  containerComponentTypes.includes(component.type);

const findSimpleComponents = (
  externalComponents: ExternalComponentV3[],
): ExternalSimpleComponent[] => externalComponents.filter(isSimpleComponent);

const isSimpleComponent = (component: ExternalComponentV3): component is ExternalSimpleComponent =>
  !isContainer(component);

const findTopLevelComponentIds = (externalComponents: ExternalComponentV3[]) =>
  externalComponents
    .filter((component) => findParent(externalComponents, component.id) === null)
    .map(({ id }) => id);

const getChildrenIdsOfAllContainers = (
  externalComponents: ExternalComponentV3[],
): IFormLayoutOrder => {
  const entries: [string, string[]][] = findContainerComponents(externalComponents).map(
    (container) => [container.id, getChildIds(container)],
  );
  return Object.fromEntries(entries);
};

const convertSimpleComponent = (
  externalComponentList: ExternalComponentV3[],
  externalComponent: ExternalSimpleComponent,
): FormComponent => {
  const pageIndex = findPageIndexOfComponent(externalComponentList, externalComponent.id);
  return externalSimpleComponentToInternal(externalComponent, pageIndex);
};

const convertContainerComponent = (
  externalComponentList: ExternalComponentV3[],
  externalComponent: ExternalContainerComponent,
): FormContainer => {
  const pageIndex = findPageIndexOfComponent(externalComponentList, externalComponent.id);
  return externalContainerComponentToInternal(externalComponent, pageIndex);
};

const findParent = (
  externalComponents: ExternalComponentV3[],
  id: string,
): ExternalContainerComponent | null =>
  findContainerComponents(externalComponents).find((container) =>
    getChildIds(container).includes(id),
  ) ?? null;

const findPageIndexOfComponent = (
  externalComponents: ExternalComponentV3[],
  id: string,
): number | null => {
  const parentContainer = findParent(externalComponents, id);
  if (!parentContainer?.edit?.multiPage) return null;
  return findPageIndexInChildList(id, parentContainer.children);
};

const getChildIds = ({ edit, children = [] }: ExternalContainerComponent) =>
  edit?.multiPage ? children.map(removePageIndexPrefix) : children;
