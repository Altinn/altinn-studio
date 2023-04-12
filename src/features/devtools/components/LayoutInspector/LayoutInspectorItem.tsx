import React, { useRef } from 'react';

import classes from 'src/features/devtools/components/LayoutInspector/LayoutInspector.module.css';
import type { ExprUnresolved } from 'src/features/expressions/types';
import type { ILayoutComponentOrGroup } from 'src/layout/layout';

interface ILayoutInspectorItemProps {
  component: ExprUnresolved<ILayoutComponentOrGroup>;
}

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
  highlightElement.style.zIndex = '5000';
}

export const LayoutInspectorItem = ({ component }: ILayoutInspectorItemProps) => {
  const highlightRef = useRef<Element[]>([]);

  function onMouseEnter() {
    const referenceElements = document.querySelectorAll(`[data-componentid="${component.id}"]`);
    referenceElements.forEach((referenceElement) => {
      const highlightElement = document.createElement('div');
      setHighlightStyle(highlightElement, referenceElement as HTMLElement);
      document.body.appendChild(highlightElement);
      highlightRef.current.push(highlightElement);
    });
  }

  function onMouseLeave() {
    highlightRef.current.forEach((el) => el.remove());
    highlightRef.current = [];
  }

  return (
    <li
      className={classes.item}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <span className={classes.componentType}>{component.type}</span>
      <span className={classes.componentId}>id: &quot;{component.id}&quot;</span>
    </li>
  );
};
