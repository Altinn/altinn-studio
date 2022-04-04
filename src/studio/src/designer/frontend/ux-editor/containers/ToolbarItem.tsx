import React from 'react';
import type { DragSourceMonitor, DragSourceSpec } from 'react-dnd';
import { ToolbarItemComponent } from '../components/toolbar/ToolbarItemComponent';
import createDraggable from './DraggableToolbarItem';
import type { IDraggableProps } from './DraggableToolbarItem';

interface IToolbarItemProps {
  text: string;
  onDropAction: (...args: any) => void;
  // eslint-disable-next-line react/require-default-props
  notDraggable?: boolean;
  onClick: (...args: any) => void;
  componentType: string;
  icon: string;
}

const DraggableToolbarItemSpec: DragSourceSpec<IDraggableProps, any> = {
  beginDrag: (
    props: IDraggableProps,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _monitor: DragSourceMonitor,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _component: any,
  ) => {
    return { ...props };
  },
  canDrag: (props: any) => {
    if (props.notDraggable) {
      return false;
    }
    return true;
  },
};

export const DraggableToolbarType = 'TOOLBAR_ITEM';

const DraggableToolbarItem = createDraggable(
  DraggableToolbarType,
  DraggableToolbarItemSpec,
);

export function ToolbarItem(props: IToolbarItemProps) {
  const { notDraggable, onDropAction, componentType, onClick } = props;
  return (
    <div>
      <DraggableToolbarItem
        id={null}
        index={null}
        containerId={null}
        notDraggable={notDraggable}
        onDrop={onDropAction}
      >
        <ToolbarItemComponent
          onClick={onClick}
          componentType={componentType}
          thirdPartyLabel={props.text}
          icon={props.icon}
        />
      </DraggableToolbarItem>
    </div>
  );
}
