import React, { memo } from 'react';
import '../styles/index.css';
import { DroppableDraggableComponent } from './DroppableDraggableComponent';
import type { EditorDndEvents } from './helpers/dnd-types';
import classes from './EmptyContainerPlaceholder.module.css';
import { useText } from '../hooks/useText';

export interface IEmptyContainerPlaceholderProps {
  containerId: string;
  dndEvents: EditorDndEvents;
}

export const EmptyContainerPlaceholder = memo(function EmptyContainerPlaceholder({
  containerId,
  dndEvents,
}: IEmptyContainerPlaceholderProps) {
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
