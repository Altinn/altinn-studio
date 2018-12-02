import * as React from 'react';
import {
  DndComponentClass,
  DragSource,
  DragSourceCollector,
  DragSourceConnector,
  DragSourceMonitor,
  DragSourceSpec,
} from 'react-dnd';

const spec: DragSourceSpec<any, any> = {
  beginDrag: (props: any) => {
    return {
      type: props.type,
    };
  },
};

const collect: DragSourceCollector<any> = (connect: DragSourceConnector, monitor: DragSourceMonitor): any => ({
  ...connect,
  ...monitor,
});

export const draggableWrapper = (type: string): DndComponentClass<any> => DragSource(type, spec, collect)(
  class DraggableComponent extends React.Component<any, any> {
    public render() {
      return (
        <div>
          Hello
        </div>
      );
    }
  },
);
