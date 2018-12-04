import { Identifier } from 'dnd-core';
import * as React from 'react';
import {
  DragSourceMonitor,
  DragSourceSpec,
} from 'react-dnd';
import createDraggable, {
  IDraggableProps,
} from './Draggable';

interface IToolbarItemProps {
  text: string;
  onDropAction: (...args: any) => void;
  notDraggable?: boolean;
}

const DraggableToolbarItemSpec: DragSourceSpec<IDraggableProps, any> = {
  beginDrag: (props: IDraggableProps, monitor: DragSourceMonitor, component: any) => {
    console.log('props', props);
    return { ...props };
  },
  canDrag: (props: any) => {
    if (props.notDraggable) {
      return false;
    }
    return true;
  },
  endDrag: (props: IDraggableProps, monitor: DragSourceMonitor) => {
    if (!monitor.didDrop()) {
      return;
    }
    const droppedType: Identifier = monitor.getItemType();
    switch (droppedType) {
      case 'container': {
        // TODO: add to container
        const element: Element = monitor.getItem();
        props.onDrop(element.id);
        return;
      }
      default: {
        return;
      }
    }
  },
};

export const DraggableToolbarType: string = 'toolbar-item';

const DraggableToolbarItem = createDraggable(DraggableToolbarType, DraggableToolbarItemSpec);

export class ToolbarItem extends React.Component<IToolbarItemProps, null> {
  public render() {
    const { notDraggable, onDropAction, text } = this.props;
    return (
      <DraggableToolbarItem
        notDraggable={notDraggable}
        onDrop={onDropAction}
      >
        {text}
      </DraggableToolbarItem>
    );
  }
}
