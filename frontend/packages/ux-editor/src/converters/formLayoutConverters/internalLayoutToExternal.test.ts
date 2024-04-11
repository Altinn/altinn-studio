import {
  internalLayoutWithMultiPageGroup,
  component1Id,
  component2Id,
  component3Id,
} from '../../testing/layoutWithMultiPageGroupMocks';
import { getComponentIdWithPageIndex, internalLayoutToExternal } from './internalLayoutToExternal';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import type { ExternalComponent } from 'app-shared/types/api';
import { layoutMock } from '../../testing/layoutMock';

describe('internalLayoutToExternal', () => {
  const result = internalLayoutToExternal(internalLayoutWithMultiPageGroup);
  const { layout } = result.data;

  const simpleComponentIds = Object.keys(internalLayoutWithMultiPageGroup.components);
  const containerIds = Object.keys(internalLayoutWithMultiPageGroup.containers);
  const relevantContainerIds = containerIds.filter((key) => key != BASE_CONTAINER_ID);

  const findInternalComponent = (id) =>
    internalLayoutWithMultiPageGroup.components[id] ||
    internalLayoutWithMultiPageGroup.containers[id];
  const findExternalComponent = (id): ExternalComponent =>
    layout.find((component) => component.id === id);

  it('Creates a list containing all components and containers', () => {
    const numberOfSimpleComponents = simpleComponentIds.length;
    const numberOfContainers = relevantContainerIds.length;
    expect(layout.length).toBe(numberOfSimpleComponents + numberOfContainers);

    simpleComponentIds.forEach((id) => {
      expect(layout).toContainEqual(expect.objectContaining({ id }));
    });

    relevantContainerIds.forEach((id) => {
      expect(layout).toContainEqual(expect.objectContaining({ id }));
    });
  });

  it('Orders the top level components correctly', () => {
    const indexOfTopLevelComponent1 = layout.findIndex(
      (component) => component.id === component1Id,
    );
    const indexOfTopLevelComponent2 = layout.findIndex(
      (component) => component.id === component2Id,
    );
    const indexOfTopLevelComponent3 = layout.findIndex(
      (component) => component.id === component3Id,
    );
    expect(indexOfTopLevelComponent1).toBeLessThan(indexOfTopLevelComponent2);
    expect(indexOfTopLevelComponent2).toBeLessThan(indexOfTopLevelComponent3);
  });

  it("Injects children's ids and page indices to their container's `children` array", () => {
    const expectedChildIdInList = (componentId: string) => {
      const component = findInternalComponent(componentId);
      const { pageIndex } = component;
      return pageIndex === null ? componentId : `${pageIndex}:${componentId}`;
    };
    relevantContainerIds.forEach((id) => {
      const childrenIds = internalLayoutWithMultiPageGroup.order[id];
      const container = findExternalComponent(id);
      const expectedChildrenIds = childrenIds.map(expectedChildIdInList);
      expect(container.children).toEqual(expectedChildrenIds);
    });
  });

  it('should return component id when component reference is invalid', () => {
    const result = getComponentIdWithPageIndex(layoutMock, 'unknownComponentId');
    expect(result).toBe('unknownComponentId');
  });

  it('Includes custom root properties', () => {
    expect(result).toEqual(
      expect.objectContaining(internalLayoutWithMultiPageGroup.customRootProperties),
    );
  });

  it('Includes custom data properties', () => {
    expect(result.data).toEqual(
      expect.objectContaining(internalLayoutWithMultiPageGroup.customDataProperties),
    );
  });
});
