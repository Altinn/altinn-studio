import type { MutableRefObject } from 'react';
import type { StudioResizableOrientation } from '../StudioResizableLayoutContainer/StudioResizableLayoutContainer';
import { StudioResizableLayoutArea } from '../classes/StudioResizableLayoutElement';

type useResizableFunctionsReturnType = {
  resizeTo: (index: number, size: number) => void;
  resizeDelta: (index: number, size: number) => void;
  collapse: (index: number) => void;
};

export const useStudioResizableLayoutFunctions = (
  orientation: StudioResizableOrientation,
  elementRefs: MutableRefObject<HTMLDivElement[]>,
  children: any[],
  setContainerSize: (index: number, size: number) => void,
): useResizableFunctionsReturnType => {
  const getElementNeighbour = (index: number) => {
    const neighbourIndex = elementRefs.current.length < index + 2 ? index - 1 : index + 1;
    return new StudioResizableLayoutArea(
      neighbourIndex,
      elementRefs.current[neighbourIndex],
      children[neighbourIndex],
      orientation,
    );
  };

  const getElement = (index: number) => {
    return new StudioResizableLayoutArea(
      index,
      elementRefs.current[index],
      children[index],
      orientation,
    );
  };

  const calculatePixelSizes = (
    element: StudioResizableLayoutArea,
    neighbour: StudioResizableLayoutArea,
    newSize: number,
  ) => {
    const totalSize = element.size + neighbour.size;
    if (element.minimumSize > newSize) {
      newSize = element.minimumSize;
    }
    if (neighbour.minimumSize > totalSize - newSize) {
      newSize = totalSize - neighbour.minimumSize;
    }
    const neighbourNewSize = totalSize - newSize;
    return { newSize, neighbourNewSize };
  };

  const calculateFlexGrow = (
    element: StudioResizableLayoutArea,
    neighbour: StudioResizableLayoutArea,
    resizeTo: number,
    ignoreMinimumSize: boolean = false,
  ) => {
    const totalPixelSize = element.size + neighbour.size;
    const { newSize, neighbourNewSize } = ignoreMinimumSize
      ? { newSize: resizeTo, neighbourNewSize: totalPixelSize - resizeTo }
      : calculatePixelSizes(element, neighbour, resizeTo);

    const totalFlexGrow = element.flexGrow + neighbour.flexGrow;
    const containerFlexGrow = totalFlexGrow * (newSize / totalPixelSize);
    const neighbourFlexGrow = totalFlexGrow * (neighbourNewSize / totalPixelSize);
    return { containerFlexGrow, neighbourFlexGrow };
  };

  const forceSize = (index: number, size: number) => {
    const element = getElement(index);
    const neighbour = getElementNeighbour(index);

    const { containerFlexGrow, neighbourFlexGrow } = calculateFlexGrow(
      element,
      neighbour,
      size,
      true,
    );

    setContainerSize(index, containerFlexGrow);
    setContainerSize(neighbour.index, neighbourFlexGrow);
  };

  const resizeTo = (index: number, size: number) => {
    const element = getElement(index);
    const neighbour = getElementNeighbour(index);

    if (element.collapsed || neighbour.collapsed) {
      return;
    }

    const { containerFlexGrow, neighbourFlexGrow } = calculateFlexGrow(element, neighbour, size);

    setContainerSize(index, containerFlexGrow);
    setContainerSize(neighbour.index, neighbourFlexGrow);
  };

  const resizeDelta = (index: number, size: number) => {
    const element = getElement(index);
    resizeTo(index, element.size + size);
  };

  const collapse = (index: number) => {
    const element = getElement(index);
    forceSize(index, element.collapsedSize);
  };

  return { resizeTo, resizeDelta, collapse };
};
