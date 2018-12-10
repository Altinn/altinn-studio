import * as React from 'react';
import {
  DragSourceMonitor,
  DragSourceSpec,
} from 'react-dnd';
import createDraggable, {
  IDraggableProps,
} from './DraggableToolbarItem';

interface IToolbarItemProps {
  text: string;
  onDropAction: (...args: any) => void;
  notDraggable?: boolean;
}

const DraggableToolbarItemSpec: DragSourceSpec<IDraggableProps, any> = {
  beginDrag: (props: IDraggableProps, monitor: DragSourceMonitor, component: any) => {
    return { ...props };
  },
  canDrag: (props: any) => {
    if (props.notDraggable) {
      return false;
    }
    return true;
  },
};

export const DraggableToolbarType: string = 'TOOLBAR_ITEM';

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
