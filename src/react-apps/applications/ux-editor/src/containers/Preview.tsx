import * as React from 'react';
import {
  DropTargetMonitor,
  DropTargetSpec,
} from 'react-dnd';
import { connect } from 'react-redux';
import formDesignerActionDispatcher from '../actions/formDesignerActions/formDesignerActionDispatcher';
import { makeGetDesignModeSelector } from '../selectors/getAppData';
import { makeGetLayoutComponentsSelector, makeGetLayoutContainersSelector, makeGetLayoutOrderSelector } from '../selectors/getLayoutData';
import { Container } from './Container';
import createDroppable, { IDroppableProps } from './Droppable';
import { DraggableToolbarType } from './ToolbarItem';

export interface IPreviewProps {
  designMode: boolean;
  layoutOrder: any;
  components: any;
  containers: any;
}
export interface IPreviewState { }

export class PreviewComponent extends React.Component<
  IPreviewProps,
  IPreviewState
  > {

  public droppableSpec: DropTargetSpec<IDroppableProps> = {
    hover(props: IDroppableProps) {
      return;
    },
    drop(props: IDroppableProps, monitor: DropTargetMonitor) {
      switch (monitor.getItemType()) {
        case DraggableToolbarType: {
          const toolbarItem = monitor.getItem();
          if (!toolbarItem.onDrop) {
            console.warn('Draggable Item doesn\'t have an onDrop-event');
            break;;
          }
          console.log('calling toolbarItem.onDrop with', props);
          toolbarItem.onDrop(props.id);
          break;
        }
        case 'items': {
          console.log('droppable dropped on item', props.id);
          break;
        }
        case 'container': {
          console.log('droppable dropped container', props.id);
          break;
        }
        default: {
          break;
        }
      }
    },
    canDrop(props: IDroppableProps, monitor: DropTargetMonitor) {
      return false;
    }
  };

  public render() {
    return (
      <div className='col-12'>
        {this.renderContainer()}
      </div>
    );
  }

  public componentWillMount() {
    if (!Object.keys(this.props.layoutOrder).length) {
      // Create baseContainer if it doesn't exist
      formDesignerActionDispatcher.addFormContainer({
        repeating: false,
        dataModelGroup: null,
        index: 0,
      });
    }
  }

  public renderContainer = (): JSX.Element => {
    const baseContainerId = Object.keys(this.props.layoutOrder) ? Object.keys(this.props.layoutOrder)[0] : null;
    if (!baseContainerId) {
      return null;
    }
    const DroppableWrapper = createDroppable([DraggableToolbarType, 'items', 'container'], this.droppableSpec);
    return (
      <DroppableWrapper
        id={baseContainerId}
      >
        <Container
          id={baseContainerId}
          baseContainer={true}
        />
      </DroppableWrapper>
    );
  }
}

const makeMapStateToProps = () => {
  const GetLayoutComponentsSelector = makeGetLayoutComponentsSelector();
  const GetLayoutContainersSelector = makeGetLayoutContainersSelector();
  const GetLayoutOrderSelector = makeGetLayoutOrderSelector();
  const GetDesignModeSelector = makeGetDesignModeSelector();
  const mapStateToProps = (state: IAppState, empty: any): IPreviewProps => {
    return {
      layoutOrder: GetLayoutOrderSelector(state),
      components: GetLayoutComponentsSelector(state),
      containers: GetLayoutContainersSelector(state),
      designMode: GetDesignModeSelector(state),
    };
  };
  return mapStateToProps;
};

export const Preview = connect(makeMapStateToProps)(PreviewComponent);
