export function useResetScrollPosition(getScrollPosition: () => number | undefined, whenSelectorVisible?: string) {
  return (prevScrollPosition: number | undefined) => {
    if (prevScrollPosition === undefined) {
      return;
    }
    let attemptsLeft = 10;
    const check = () => {
      attemptsLeft--;
      if (attemptsLeft <= 0) {
        return;
      }

      // If the whenSelectorVisible is set, we should only reset the scroll position if the element is visible
      if (whenSelectorVisible) {
        const element = document.querySelector(whenSelectorVisible);
        if (!element || !element.getBoundingClientRect().y) {
          requestAnimationFrame(check);
          return;
        }
      }

      const newScrollPosition = getScrollPosition();
      const scrollBy = newScrollPosition !== undefined ? newScrollPosition - prevScrollPosition : undefined;

      if (newScrollPosition !== undefined && scrollBy !== undefined && Math.abs(scrollBy) > 1) {
        window.scrollBy({ top: scrollBy });
      } else {
        requestAnimationFrame(check);
      }
    };
    requestAnimationFrame(check);
  };
}
