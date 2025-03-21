export const useKeyboardControls = (
  onResize: (delta: number) => void,
): { onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void } => {
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      if (event.shiftKey) {
        onResize(-50);
      } else {
        onResize(-10);
      }
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      if (event.shiftKey) {
        onResize(50);
      } else {
        onResize(10);
      }
    }
  };

  return { onKeyDown };
};
