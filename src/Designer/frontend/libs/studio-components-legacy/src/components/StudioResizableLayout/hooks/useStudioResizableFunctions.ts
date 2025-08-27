import type { MutableRefObject } from 'react';
import type { StudioResizableOrientation } from '../StudioResizableLayoutContainer/StudioResizableLayoutContainer';
import { StudioResizableLayoutArea } from '../classes/StudioResizableLayoutElement';

type useResizableFunctionsReturnType = {
  resizeTo: (index: number, size: number) => void;
  resizeDelta: (index: number, size: number) => void;
};

export const useStudioResizableLayoutFunctions = (
  orientation: StudioResizableOrientation,
  elementRefs: MutableRefObject<HTMLDivElement[]>,
  children: any[],
  setContainerSize: (index: number, size: number) => void,
): useResizableFunctionsReturnType => {
  const getElement = (index: number): StudioResizableLayoutArea => {
    return new StudioResizableLayoutArea(
      index,
      elementRefs.current[index],
      children[index],
      orientation,
    );
  };

  const getElementNeighbour = (index: number): StudioResizableLayoutArea => {
    const neighbourIndex = elementRefs.current.length < index + 2 ? index - 1 : index + 1;
    return getElement(neighbourIndex);
  };

  const calculatePixelSizes = (
    element: StudioResizableLayoutArea,
    neighbour: StudioResizableLayoutArea,
    newSize: number,
  ): { newSize: number; neighbourNewSize: number } => {
    const totalSize = element.size + neighbour.size;
    if (element.maximumSize < newSize) newSize = element.maximumSize;
    if (element.minimumSize > newSize) newSize = element.minimumSize;
    if (neighbour.minimumSize > totalSize - newSize) newSize = totalSize - neighbour.minimumSize;
    const neighbourNewSize = totalSize - newSize;
    return { newSize, neighbourNewSize };
  };

  const calculateFlexGrow = (
    element: StudioResizableLayoutArea,
    neighbour: StudioResizableLayoutArea,
    resizeTo: number,
    ignoreMinimumSize: boolean = false,
  ): { containerFlexGrow: number; neighbourFlexGrow: number } => {
    const totalPixelSize = element.size + neighbour.size;
    const { newSize, neighbourNewSize } = ignoreMinimumSize
      ? { newSize: resizeTo, neighbourNewSize: totalPixelSize - resizeTo }
      : calculatePixelSizes(element, neighbour, resizeTo);

    const totalFlexGrow = element.flexGrow + neighbour.flexGrow;
    const containerFlexGrow = (newSize / totalPixelSize) * totalFlexGrow;
    const neighbourFlexGrow = (neighbourNewSize / totalPixelSize) * totalFlexGrow;
    return { containerFlexGrow, neighbourFlexGrow };
  };

  const resizeTo = (index: number, size: number): void => {
    const element = getElement(index);
    const neighbour = getElementNeighbour(index);

    if (element.collapsed || neighbour.collapsed) {
      return;
    }

    const { containerFlexGrow, neighbourFlexGrow } = calculateFlexGrow(element, neighbour, size);

    setContainerSize(index, containerFlexGrow);
    setContainerSize(neighbour.index, neighbourFlexGrow);
  };

  const resizeDelta = (index: number, size: number): void => {
    const element = getElement(index);
    resizeTo(index, element.size + size);
  };

  return { resizeTo, resizeDelta };
};
