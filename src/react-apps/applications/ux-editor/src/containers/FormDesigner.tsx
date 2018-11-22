import {createStyles, Grid, Theme, withStyles} from '@material-ui/core';
import classNames = require('classnames');
import * as React from 'react';
import AppDataActionDispatcher from '../actions/appDataActions/appDataActionDispatcher';
import FormDesignerActionDispatchers from '../actions/formDesignerActions/formDesignerActionDispatcher';
import ManageServiceConfigurationDispatchers from '../actions/manageServiceConfigurationActions/manageServiceConfigurationActionDispatcher';
import { Preview } from './Preview';
import { Toolbar } from './Toolbar';

export interface IFormDesignerProps {
  classes: any;
}
export interface IFormDesignerState { }

const styles = ((theme: Theme) => createStyles({
  root: {
    flexGrow: 1,
    minHeight: 'calc(100vh - 70px - 1em)',
    paddingTop: '1em',
  },
  container: {
    height: 'calc(100vh - 70px - 1em)',
  },
  mainContent: {
    borderLeft: '1px solid #C9C9C9',
    borderRight: '1px solid #C9C9C9',
  },
}));

class FormDesigner extends React.Component<
  IFormDesignerProps,
  IFormDesignerState
  > {
  public componentDidMount() {
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { org, service } = altinnWindow;
    const servicePath = `${org}/${service}`;

    FormDesignerActionDispatchers.fetchFormLayout(`${altinnWindow.location.origin}/designer/${servicePath}/React/GetFormLayout`);
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
        Save
      </button>
    );
  }

  public render() {
    const {classes} = this.props;
    return (
      <div className={classes.root}>
        <Grid
          container={true}
          spacing={24}
          classes={{container: classNames(classes.container)}}
        >
          <Grid item={true} xs={2}>
            <Toolbar />
          </Grid>
          <Grid item={true} xs={8} className={classes.mainContent}>
          <Preview />
            <div className='col-12 justify-content-center d-flex mt-3'>
              {this.renderSaveButton()}
            </div>
          </Grid>
          <Grid item={true}>
            <div/>
          </Grid>
        </Grid>
      </div>
    );
  }
}

export default withStyles(styles, {withTheme: true})(FormDesigner);
