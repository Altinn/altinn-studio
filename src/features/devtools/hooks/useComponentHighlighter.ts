import { useRef } from 'react';

import { useComponentRefs } from 'src/features/devtools/hooks/useComponentRefs';

function setHighlightStyle(highlightElement: HTMLElement, referenceElement: HTMLElement): void {
  highlightElement.style.position = 'absolute';
  const { top, left, bottom, right } = referenceElement.getBoundingClientRect();
  const width = right - left;
  const height = bottom - top;
  highlightElement.style.top = `${top + window.scrollY}px`;
  highlightElement.style.left = `${left}px`;
  highlightElement.style.width = `${width}px`;
  highlightElement.style.height = `${height}px`;
  highlightElement.style.backgroundColor = 'rgba(0, 200, 255, 0.33)';
  highlightElement.style.border = '3px solid rgb(0, 200, 255)';
  highlightElement.style.zIndex = '900';
}

export function useComponentHighlighter(componentId: string, exact = false) {
  const highlightRef = useRef<Element[]>([]);
  const refs = useComponentRefs({ componentId, exact });

  function onMouseEnter() {
    for (const ref of refs.current) {
      const highlightElement = document.createElement('div');
      setHighlightStyle(highlightElement, ref);
      document.body.appendChild(highlightElement);
      highlightRef.current.push(highlightElement);
    }
  }

  function onMouseLeave() {
    highlightRef.current.forEach((el) => el.remove());
    highlightRef.current = [];
  }

  return {
    onMouseEnter,
    onMouseLeave,
  };
}
