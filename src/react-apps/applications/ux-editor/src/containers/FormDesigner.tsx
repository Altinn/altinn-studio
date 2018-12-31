import { createStyles, Grid, Theme, withStyles } from '@material-ui/core';
import classNames = require('classnames');
import * as React from 'react';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import { connect } from 'react-redux';
import VersionControlHeader from '../../../shared/src/version-control/versionControlHeader';
import AppDataActionDispatcher from '../actions/appDataActions/appDataActionDispatcher';
import FormDesignerActionDispatchers from '../actions/formDesignerActions/formDesignerActionDispatcher';
import ManageServiceConfigurationDispatchers from '../actions/manageServiceConfigurationActions/manageServiceConfigurationActionDispatcher';
import DesignView from './DesignView';
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
      `${altinnWindow.location.origin}/designer/${servicePath}/UIEditor/GetFormLayout`);
    AppDataActionDispatcher.setDesignMode(true);
    ManageServiceConfigurationDispatchers.fetchJsonFile(
      `${altinnWindow.location.origin}/designer/${
      servicePath}/UIEditor/GetJsonFile?fileName=ServiceConfigurations.json`);
  }

  public renderSaveButton = (): JSX.Element => {
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;

    const handleSaveButton: any = (): any => {
      ManageServiceConfigurationDispatchers.saveJsonFile(
        `${altinnWindow.location.origin}/designer/${altinnWindow.org}/${
        altinnWindow.service}/UIEditor/SaveJsonFile?fileName=ServiceConfigurations.json`);

      FormDesignerActionDispatchers.saveFormLayout(
        `${altinnWindow.location.origin}/designer/${altinnWindow.org}/${
        altinnWindow.service
        }/UIEditor/SaveFormLayout`,
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

  public render() {
    const { classes } = this.props;
    return (
      <div className={classes.root}>
        <Grid
          container={true}
          spacing={0}
          wrap={'nowrap'}
          classes={{ container: classNames(classes.container) }}
        >
          <Grid item={true} xs={2} classes={{ item: classNames(classes.item) }}>
            <Toolbar />
          </Grid>
          <Grid item={true} xs={8} className={classes.mainContent} classes={{ item: classNames(classes.item) }}>
            <VersionControlHeader language={this.props.language} />
            <div
              style={{
                width: 'calc(100% - 48px)',
                height: '71px', background: '#022F51',
                marginTop: '48px',
                marginLeft: '24px',
              }}
            />
            <div
              style={{
                width: 'calc(100% - 48px)',
                paddingTop: '24px',
                marginLeft: '24px',
                background: '#FFFFFF',
              }}
            >
              <DesignView />
              <div className='col-12 justify-content-center d-flex mt-3'>
                {this.renderSaveButton()}
              </div>
            </div>
          </Grid>
          <Grid item={true} classes={{ item: classNames(classes.item) }}>
            <div />
          </Grid>
        </Grid>
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

export default withStyles(
  styles,
  { withTheme: true },
)(
  connect(
    mapsStateToProps,
  )(
    DragDropContext(
      HTML5Backend,
    )(
      FormDesigner,
    ),
  ),
);
