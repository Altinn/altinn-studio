import { useStudioResizableLayoutContext } from './useStudioResizableLayoutContext';

export const useResizable = (minimumSize: number) => {
  const { orientation } = useStudioResizableLayoutContext();

  const calculateTotalFlexGrow = (previousElement: HTMLElement, nextElement: HTMLElement) => {
    const previousFlexGrow = parseFloat(previousElement.style.flexGrow || '1');
    const nextFlexGrow = parseFloat(nextElement.style.flexGrow || '1');
    return previousFlexGrow + nextFlexGrow;
  };

  const calculateElementDimensions = (
    previousElement: HTMLElement,
    nextElement: HTMLElement,
  ): { sumFlexGrow: number; sumElementSize: number } => {
    const sumFlexGrow = calculateTotalFlexGrow(previousElement, nextElement);
    if (orientation === 'horizontal') {
      const sumElementSize = previousElement.offsetWidth + nextElement.offsetWidth;
      return { sumFlexGrow, sumElementSize };
    } else {
      const sumElementSize = previousElement.offsetHeight + nextElement.offsetHeight;
      return { sumFlexGrow, sumElementSize };
    }
  };

  const calculateFlexGrow = (
    previousElement: HTMLElement,
    nextElement: HTMLElement,
    delta: number,
    minimumSize: number,
  ): { previousElementFlexGrow: number; nextElementFlexGrow: number } => {
    const { sumFlexGrow, sumElementSize } = calculateElementDimensions(
      previousElement,
      nextElement,
    );
    let previousElementSize =
      (orientation === 'vertical' ? previousElement.offsetHeight : previousElement.offsetWidth) +
      delta;
    let nextElementSize =
      (orientation === 'vertical' ? nextElement.offsetHeight : nextElement.offsetWidth) - delta;

    if (previousElementSize < minimumSize) {
      previousElementSize = minimumSize;
      nextElementSize = sumElementSize - minimumSize;
    }

    if (nextElementSize < 0) {
      nextElementSize = 0;
      previousElementSize = sumElementSize - minimumSize;
    }

    const previousElementFlexGrow = sumFlexGrow * (previousElementSize / sumElementSize);
    const nextElementFlexGrow = sumFlexGrow * (nextElementSize / sumElementSize);
    return { previousElementFlexGrow, nextElementFlexGrow };
  };
  const resizeDelta = (previousElement: any, nextElement: any, delta: number) => {
    if (!previousElement || !nextElement) {
      console.log('No previous or next element found');
      return;
    }

    const { previousElementFlexGrow, nextElementFlexGrow } = calculateFlexGrow(
      previousElement,
      nextElement,
      delta,
      minimumSize,
    );
    previousElement.style.flexGrow = previousElementFlexGrow.toString();
    nextElement.style.flexGrow = nextElementFlexGrow.toString();
  };

  return { resizeDelta };
};
