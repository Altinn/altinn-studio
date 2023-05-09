import React from 'react';
import '../styles/index.css';
import { DroppableDraggableComponent } from './DroppableDraggableComponent';
import type { EditorDndEvents } from './helpers/dnd-types';
import classes from './EmptyContainerPlaceholder.module.css';
import { useText } from '../hooks/useText';

export interface IEmptyContainerPlaceholderProps {
  containerId: string;
  dndEvents: EditorDndEvents;
}

export const EmptyContainerPlaceholder = (props: IEmptyContainerPlaceholderProps) => {
  const t = useText();

  return (
    <DroppableDraggableComponent
      dndEvents={props.dndEvents}
      canDrag={false}
      id='placeholder'
      index={0}
      containerId={props.containerId}
      component={() => (
        <p className={classes.emptyContainerText}>{t('ux_editor.container_empty')}</p>
      )}
    />
  );
};
