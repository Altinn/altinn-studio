import * as React from 'react';
import {
  ConnectDropTarget,
  DropTarget,
  DropTargetConnector,
  DropTargetMonitor,
  DropTargetSpec,
} from 'react-dnd';
import Item from './Item';

const dropTargetSpec: DropTargetSpec<ITreeProps> = {
  hover(props: any, monitor: DropTargetMonitor) {
    const {id: draggedId, parent, items} = monitor.getItem();

    if (!monitor.isOver({shallow: true})) {
      return;
    }

    const descendantNode = props.find(props.parent, items);
    if (descendantNode) {
      return;
    }
    if (parent === props.parent || draggedId === props.parent) {
      return;
    }

    props.move(draggedId, props.id, props.parent);
  },
};

export interface ITreeProps {
  items: any[];
  parent: any;
  move: (...args: any) => any;
  find: (...args: any) => any;
}

class Tree extends React.Component<ITreeProps & {connectDropTarget: ConnectDropTarget}, any> {
  public render() {
    const {connectDropTarget, items, parent, move, find} = this.props;
    console.log('tree props', this.props);
    return connectDropTarget(
      <div
        style={{
          position: 'relative',
          minHeight: 10,
          paddingTop: 10,
          marginTop: -11,
          marginLeft: '2em',
        }}
      >
        {items.map((item: any, index: number) => {
          const DraggableItem: any = {
            id: item,
            title: 'Test ' + index,
            children: [],
          };
          return (
            <Item
              key={item}
              id={item}
              parent={parent}
              item={DraggableItem}
              move={move}
              find={find}
            />
          );
        })}
      </div>,
    );
  }
}

export default DropTarget('ITEM', dropTargetSpec, (connect: DropTargetConnector) => ({
  connectDropTarget: connect.dropTarget(),
}))(Tree);
