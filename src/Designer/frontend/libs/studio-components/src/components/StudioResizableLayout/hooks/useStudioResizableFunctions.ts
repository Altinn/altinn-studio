import type { MutableRefObject, ReactElement } from 'react';
import type { StudioResizableLayoutElementProps } from '../StudioResizableLayoutElement/StudioResizableLayoutElement';
import type { StudioResizableOrientation } from '../StudioResizableLayoutContainer/StudioResizableLayoutContainer';
import { StudioResizableLayoutArea } from '../classes/StudioResizableLayoutElement';

type useResizableFunctionsReturnType = {
  resizeTo: (index: number, size: number) => void;
  resizeDelta: (index: number, size: number) => void;
};

export const useStudioResizableLayoutFunctions = (
  orientation: StudioResizableOrientation,
  elementRefs: MutableRefObject<(HTMLDivElement | null)[]>,
  children: ReactElement<StudioResizableLayoutElementProps>[],
  setContainerSize: (index: number, size: number) => void,
): useResizableFunctionsReturnType => {
  const getElement = (index: number): StudioResizableLayoutArea => {
    return new StudioResizableLayoutArea(
      index,
      elementRefs.current[index]!,
      children[index],
      orientation,
    );
  };

  const getElementNeighbor = (index: number): StudioResizableLayoutArea => {
    const neighborIndex = elementRefs.current.length < index + 2 ? index - 1 : index + 1;
    return getElement(neighborIndex);
  };

  const calculatePixelSizes = (
    element: StudioResizableLayoutArea,
    neighbor: StudioResizableLayoutArea,
    newSize: number,
  ): { newSize: number; neighborNewSize: number } => {
    const totalSize = element.size + neighbor.size;
    if (element.maximumSize < newSize) newSize = element.maximumSize;
    if (element.minimumSize > newSize) newSize = element.minimumSize;
    if (neighbor.minimumSize > totalSize - newSize) newSize = totalSize - neighbor.minimumSize;
    const neighborNewSize = totalSize - newSize;
    return { newSize, neighborNewSize };
  };

  const calculateFlexGrow = (
    element: StudioResizableLayoutArea,
    neighbor: StudioResizableLayoutArea,
    resizeTo: number,
    ignoreMinimumSize: boolean = false,
  ): { containerFlexGrow: number; neighborFlexGrow: number } => {
    const totalPixelSize = element.size + neighbor.size;
    const { newSize, neighborNewSize } = ignoreMinimumSize
      ? { newSize: resizeTo, neighborNewSize: totalPixelSize - resizeTo }
      : calculatePixelSizes(element, neighbor, resizeTo);

    const totalFlexGrow = element.flexGrow + neighbor.flexGrow;
    const containerFlexGrow = (newSize / totalPixelSize) * totalFlexGrow;
    const neighborFlexGrow = (neighborNewSize / totalPixelSize) * totalFlexGrow;
    return { containerFlexGrow, neighborFlexGrow };
  };

  const resizeTo = (index: number, size: number): void => {
    const element = getElement(index);
    const neighbor = getElementNeighbor(index);

    if (element.collapsed || neighbor.collapsed) {
      return;
    }

    const { containerFlexGrow, neighborFlexGrow } = calculateFlexGrow(element, neighbor, size);

    setContainerSize(index, containerFlexGrow);
    setContainerSize(neighbor.index, neighborFlexGrow);
  };

  const resizeDelta = (index: number, size: number): void => {
    const element = getElement(index);
    resizeTo(index, element.size + size);
  };

  return { resizeTo, resizeDelta };
};
