import * as React from 'react';
import { DragSourceMonitor,
  DragSourceSpec } from 'react-dnd';
// eslint-disable-next-line import/no-cycle
import { ToolbarItemComponent } from '../components/toolbar/ToolbarItemComponent';
import createDraggable, { IDraggableProps } from './DraggableToolbarItem';

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  beginDrag: (props: IDraggableProps, _monitor: DragSourceMonitor, _component: any) => {
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

export function ToolbarItem(props: IToolbarItemProps) {
  const {
    notDraggable,
    onDropAction,
    componentType,
    onClick,
  } = props;
  return (
    <div >
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
