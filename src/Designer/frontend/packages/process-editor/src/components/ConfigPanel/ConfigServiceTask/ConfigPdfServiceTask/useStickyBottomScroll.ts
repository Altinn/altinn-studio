import { useRef, useEffect, useCallback } from 'react';

type UseStickyBottomScrollResult<T extends HTMLElement> = {
  ref: React.RefObject<T>;
  onOpen: (triggerElement: HTMLElement) => void;
};

const getScrollableParent = (element: HTMLElement | null): HTMLElement | null => {
  if (!element) return null;
  let parent = element.parentElement;
  while (parent) {
    const { overflow, overflowY } = getComputedStyle(parent);
    if (
      overflow === 'auto' ||
      overflow === 'scroll' ||
      overflowY === 'auto' ||
      overflowY === 'scroll'
    ) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
};

const isScrolledToBottom = (element: HTMLElement): boolean => {
  const threshold = 5;
  return element.scrollHeight - element.scrollTop - element.clientHeight < threshold;
};

export const useStickyBottomScroll = <T extends HTMLElement>(
  isOpen: boolean,
): UseStickyBottomScrollResult<T> => {
  const ref = useRef<T>(null);
  const wasAtBottomRef = useRef<boolean>(false);

  const onOpen = useCallback((triggerElement: HTMLElement) => {
    const scrollableParent = getScrollableParent(triggerElement);
    wasAtBottomRef.current = scrollableParent ? isScrolledToBottom(scrollableParent) : false;
  }, []);

  useEffect(() => {
    if (isOpen && wasAtBottomRef.current && ref.current) {
      requestAnimationFrame(() => {
        const scrollableParent = getScrollableParent(ref.current);
        if (scrollableParent) {
          scrollableParent.scrollTop = scrollableParent.scrollHeight;
        }
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !wasAtBottomRef.current || !ref.current) {
      return;
    }

    const element = ref.current;
    const scrollableParent = getScrollableParent(element);
    if (!scrollableParent) return;

    const resizeObserver = new ResizeObserver(() => {
      scrollableParent.scrollTop = scrollableParent.scrollHeight;
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isOpen]);

  return { ref, onOpen };
};
