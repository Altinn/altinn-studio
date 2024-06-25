import type { MutableRefObject, Dispatch, SetStateAction } from 'react';
import type { StudioResizableOrientation } from '../StudioResizableLayoutContainer/StudioResizableLayoutContainer';
import { ResizeHandler } from '../classes/StudioResizableHandler';

type useResizableFunctionsReturnType = {
  resizeTo: (index: number, size: number) => void;
  resizeDelta: (index: number, size: number) => void;
};

export const useResizableFunctions = (
  orientation: StudioResizableOrientation,
  elementRefs: MutableRefObject<HTMLDivElement[]>,
  children: any[],
  setContainerSizes: Dispatch<SetStateAction<number[]>>,
): useResizableFunctionsReturnType => {
  const getElementNeighbour = (index: number) => {
    if (elementRefs.current.length < index + 2) {
      return { index: index - 1, ref: elementRefs.current[index - 1], child: children[index - 1] };
    } else {
      return { index: index + 1, ref: elementRefs.current[index + 1], child: children[index + 1] };
    }
  };

  const getElement = (index: number) => {
    return { index, ref: elementRefs.current[index], child: children[index] };
  };

  const resizeTo = (index: number, size: number) => {
    const { ref: elementRef, child: element } = getElement(index);
    const {
      index: neighbourIndex,
      ref: neighbourRef,
      child: neighbour,
    } = getElementNeighbour(index);

    const resizeHandler = new ResizeHandler(orientation, elementRef, 0, neighbourRef, 0);
    const { containerFlexGrow, neighbourFlexGrow } = resizeHandler.resizeTo(size);

    setContainerSizes((prev) => {
      const newSizes = [...prev];
      newSizes[index] = containerFlexGrow;
      newSizes[neighbourIndex] = neighbourFlexGrow;
      return newSizes;
    });
  };

  const resizeDelta = (index: number, size: number) => {
    const { ref: elementRef, child: element } = getElement(index);
    const {
      index: neighbourIndex,
      ref: neighbourRef,
      child: neighbour,
    } = getElementNeighbour(index);

    const resizeHandler = new ResizeHandler(
      orientation,
      elementRef,
      element.props.minimumSize || 0,
      neighbourRef,
      neighbour.props.minimumSize || 0,
    );
    const { containerFlexGrow, neighbourFlexGrow } = resizeHandler.resizeDelta(size);

    setContainerSizes((prev) => {
      const newSizes = [...prev];
      newSizes[index] = containerFlexGrow;
      newSizes[neighbourIndex] = neighbourFlexGrow;
      return newSizes;
    });
  };

  return { resizeTo, resizeDelta };
};
