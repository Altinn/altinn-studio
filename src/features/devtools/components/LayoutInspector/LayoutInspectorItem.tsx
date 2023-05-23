/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React from 'react';

import cn from 'classnames';

import classes from 'src/features/devtools/components/LayoutInspector/LayoutInspector.module.css';
import { useComponentHighlighter } from 'src/features/devtools/hooks/useComponentHighlighter';
import type { ExprUnresolved } from 'src/features/expressions/types';
import type { ILayoutComponentOrGroup } from 'src/layout/layout';

interface ILayoutInspectorItemProps {
  component: ExprUnresolved<ILayoutComponentOrGroup>;
  selected: boolean;
  onClick: () => void;
}

export const LayoutInspectorItem = ({ component, onClick, selected }: ILayoutInspectorItemProps) => {
  const { onMouseEnter, onMouseLeave } = useComponentHighlighter(component.id);

  return (
    <li
      className={cn(classes.item, { [classes.active]: selected })}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      <span className={classes.componentType}>{component.type}</span>
      <span className={classes.componentId}>{component.id}</span>
    </li>
  );
};
