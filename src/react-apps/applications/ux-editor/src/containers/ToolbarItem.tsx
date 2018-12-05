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
};

export const DraggableToolbarType: string = 'toolbar-item';

const DraggableToolbarItem = createDraggable(DraggableToolbarType, DraggableToolbarItemSpec);

export class ToolbarItem extends React.Component<IToolbarItemProps, null> {
  public render() {
    const { notDraggable, onDropAction, text } = this.props;
    return (
      <DraggableToolbarItem
        id={null}
        index={null}
        containerId={null}
        notDraggable={notDraggable}
        onDrop={onDropAction}
      >
        {text}
      </DraggableToolbarItem>
    );
  }
}
