/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { useEffect, useRef } from 'react';

import { ExclamationmarkTriangleIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

import classes from 'src/features/devtools/components/LayoutInspector/LayoutInspector.module.css';
import { useComponentHighlighter } from 'src/features/devtools/hooks/useComponentHighlighter';
import type { CompExternal } from 'src/layout/layout';

interface ILayoutInspectorItemProps {
  component: CompExternal;
  hasErrors: boolean;
  selected: boolean;
  onClick: () => void;
}

export const LayoutInspectorItem = ({ component, onClick, selected, hasErrors }: ILayoutInspectorItemProps) => {
  const { onMouseEnter, onMouseLeave } = useComponentHighlighter(component.id);

  const el = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (selected && el.current) {
      el.current.scrollIntoView({ block: 'nearest' });
    }
  }, [selected]);

  return (
    <li
      ref={el}
      className={cn(classes.item, { [classes.active]: selected })}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      <span className={classes.componentType}>{component.type}</span>
      <span className={classes.componentId}>{component.id}</span>
      {hasErrors && (
        <span className={classes.listIcon}>
          <ExclamationmarkTriangleIcon className={classes.error} />
        </span>
      )}
    </li>
  );
};
