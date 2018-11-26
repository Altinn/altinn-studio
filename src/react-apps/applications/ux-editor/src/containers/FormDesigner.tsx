import {createStyles, Grid, Theme, withStyles} from '@material-ui/core';
import classNames = require('classnames');
import * as React from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import { connect } from 'react-redux';
import AppDataActionDispatcher from '../actions/appDataActions/appDataActionDispatcher';
import FormDesignerActionDispatchers from '../actions/formDesignerActions/formDesignerActionDispatcher';
import ManageServiceConfigurationDispatchers from '../actions/manageServiceConfigurationActions/manageServiceConfigurationActionDispatcher';
import components from '../components';
import { Preview } from './Preview';
import { Toolbar } from './Toolbar';

export interface IFormDesignerProvidedProps {
  classes: any;
}
export interface IFormDesignerProps extends IFormDesignerProvidedProps {
  language: any;
}
export interface IFormDesignerState { }

const styles = ((theme: Theme) => createStyles({
  root: {
    flexGrow: 1,
    minHeight: 'calc(100vh - 69px)',
  },
  container: {
    height: 'calc(100vh - 69px)',
    top: '69px',
    overflow: 'auto',
  },
  item: {
    padding: 0,
    minWidth: '171px', /* Two columns at 1024px screen size */
  },
  mainContent: {
    borderLeft: '1px solid #C9C9C9',
    borderRight: '1px solid #C9C9C9',
    minWidth: '682px !important', /* Eight columns at 1024px screen size */
  },
}));
export enum LayoutItemType {
  Container = 'CONTAINER',
  Component = 'COMPONENT',
}

class FormDesigner extends React.Component<
  IFormDesignerProps,
  IFormDesignerState
  > {
  public componentDidMount() {
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { org, service } = altinnWindow;
    const servicePath = `${org}/${service}`;

    FormDesignerActionDispatchers.fetchFormLayout(
      `${altinnWindow.location.origin}/designer/${servicePath}/React/GetFormLayout`,
    );
    AppDataActionDispatcher.setDesignMode(true);
  }

  public renderSaveButton = (): JSX.Element => {
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;

    const handleSaveButton: any = (): any => {
      ManageServiceConfigurationDispatchers.saveJsonFile(
        `${altinnWindow.location.origin}/designer/${altinnWindow.org}/${
        altinnWindow.service}/React/SaveJsonFile?fileName=ServiceConfigurations.json`);

      FormDesignerActionDispatchers.saveFormLayout(
        `${altinnWindow.location.origin}/designer/${altinnWindow.org}/${
        altinnWindow.service
        }/React/SaveFormLayout`,
      );
    };

    return (
      <button type='button' className='a-btn a-btn-success' onClick={handleSaveButton}>
        {this.props.language.general.save}
      </button>
    );
  }

  public handleNext(component: any, id: string) {
    this.setState({
      selectedComp: component,
      selectedCompId: id,
      modalOpen: true,
    });
  }

  public onDragEnd = (result: any) => {
    const { source, destination } = result;

    if (!destination) {
      return;
    }

    switch (source.droppableId) {
      case 'ITEMS':
        if (result.draggableId === 'container') {
          FormDesignerActionDispatchers.addFormContainer({
            repeating: false,
            dataModelGroup: '',
          });
        } else if (source.index === 'thirdPartyComponent') {
          // Handle third party components at some time
        } else {
          const c = components[source.index].customProperties;
          const customProperties = !c ? {} : c;
          FormDesignerActionDispatchers.addFormComponent({
            component: components[source.index].name,
            itemType: 'LayoutItemType.Component',
            title: components[source.index].name,
            ...JSON.parse(JSON.stringify(customProperties)),
          },
            destination.index,
            destination.droppableId,
          );
        }
        break;

      default:
        FormDesignerActionDispatchers.updateFormComponentOrderAction(
          result.draggableId,
          destination.index,
          source.index,
          destination.droppableId,
          source.droppableId,
        );
        break;
    }

    return;
  }

  public render() {
    const {classes} = this.props;
    return (
      <div className={classes.root}>
      <DragDropContext onDragEnd={this.onDragEnd}>
        <Grid
          container={true}
          spacing={0}
          wrap={'nowrap'}
          classes={{container: classNames(classes.container)} }
        >
          <Grid item={true} xs={2} classes={{item: classNames(classes.item)}}>
            <Toolbar />
          </Grid>
          <Grid item={true} xs={8} className={classes.mainContent} classes={{item: classNames(classes.item)}}>
          <div style={{width: 'calc(100% - 48px)', height: '71px', background: '#022F51', marginTop: '48px', marginLeft: '24px'}}/>
          <div style={{width: 'calc(100% - 48px)', paddingTop: '24px', marginLeft: '24px', background: '#FFFFFF'}}>
            <Preview />
              <div className='col-12 justify-content-center d-flex mt-3'>
                {this.renderSaveButton()}
              </div>
            </div>
          </Grid>
          <Grid item={true} classes={{item: classNames(classes.item)}}>
            <div/>
          </Grid>
        </Grid>
        </DragDropContext>
      </div>
    );
  }
}

const mapsStateToProps = (
  state: IAppState,
  props: IFormDesignerProvidedProps,
): IFormDesignerProps => {
  return {
    classes: props.classes,
    language: state.appData.language.language,
  };
};

export default withStyles(styles, {withTheme: true})(connect(mapsStateToProps)(FormDesigner));
