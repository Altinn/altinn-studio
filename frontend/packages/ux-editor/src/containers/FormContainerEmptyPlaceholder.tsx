import React, { memo } from 'react';
import '../styles/index.css';
import { DroppableDraggableComponent } from './DroppableDraggableComponent';
import type { EditorDndEvents } from './helpers/dnd-types';
import classes from './FormContainerEmptyPlaceholder.module.css';
import { useText } from '../hooks/useText';

export interface IFormContainerEmptyPlaceholderProps {
  containerId: string;
  dndEvents: EditorDndEvents;
}

export const FormContainerEmptyPlaceholder = memo(function FormContainerEmptyPlaceholder({
  containerId,
  dndEvents,
}: IFormContainerEmptyPlaceholderProps) {
  const t = useText();

  return (
    <DroppableDraggableComponent
      dndEvents={dndEvents}
      canDrag={false}
      id='placeholder'
      index={0}
      containerId={containerId}
      component={() => (
        <p className={classes.emptyContainerText}>{t('ux_editor.container_empty')}</p>
      )}
    />
  );
});
