import { createStyles, Drawer, Grid, IconButton, Theme, withStyles } from '@material-ui/core';
import classNames from 'classnames';
import * as React from 'react';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import { connect } from 'react-redux';
import FileEditor from '../../../shared/src/file-editor/FileEditor';
import ServiceLogicMenu from '../../../shared/src/navigation/drawer/rightDrawerMenu';
import altinnTheme from '../../../shared/src/theme/altinnStudioTheme';
import VersionControlHeader from '../../../shared/src/version-control/versionControlHeader';
import AppDataActionDispatcher from '../actions/appDataActions/appDataActionDispatcher';
import FormDesignerActionDispatchers from '../actions/formDesignerActions/formDesignerActionDispatcher';
import ManageServiceConfigurationDispatchers from '../actions/manageServiceConfigurationActions/manageServiceConfigurationActionDispatcher';
import { CollapsableMenuComponent } from '../components/rightDrawerMenu/CollapsableMenuComponent';
import { ConditionalRenderingModalComponent } from '../components/toolbar/ConditionalRenderingModal';
import { RuleModalComponent } from '../components/toolbar/RuleModalComponent';
import { filterDataModelForIntellisense } from '../utils/datamodel';
import DesignView from './DesignView';
import { Toolbar } from './Toolbar';

export interface IFormDesignerProvidedProps {
  classes: any;
}
export interface IFormDesignerProps extends IFormDesignerProvidedProps {
  language: any;
  dataModel: IDataModelFieldElement[];
}

type LogicMode = 'Calculation' | 'Dynamics' | 'Validation' | null;

export interface IFormDesignerState {
  codeEditorOpen: boolean;
  codeEditorMode: LogicMode;
  menuOpen: boolean;
}

const styles = ((theme: Theme) => createStyles({
  root: {
    flexGrow: 1,
    minHeight: 'calc(100vh - 69px)',
  },
  drawerRoot: {
    height: '100vh',
    overflow: 'hidden',
  },
  button: {
    'position': 'relative',
    'zIndex': 1201,
    'padding': '1.2rem 0.6rem',
    '&:hover': {
      background: 'none',
    },
  },
  container: {
    height: 'calc(100vh - 69px)',
    top: '69px',
    backgroundColor: altinnTheme.altinnPalette.primary.greyLight,
  },
  divider: {
    width: '100%',
    height: '0.1rem',
    background: altinnTheme.altinnPalette.primary.greyMedium,
  },
  item: {
    padding: 0,
    minWidth: '240px', /* Two columns at 1024px screen size */
  },
  icon: {
    'fontSize': '3rem',
    'border': '0.1rem solid ' + altinnTheme.altinnPalette.primary.blueDark,
    'color': altinnTheme.altinnPalette.primary.blueDark,
    'borderRadius': '50%',
    '&:hover': {
      color: '#fff',
      background: altinnTheme.altinnPalette.primary.blueDark,
    },
  },
  iconActive: {
    color: '#fff',
    background: altinnTheme.altinnPalette.primary.blueDark,
  },
  mainContent: {
    borderLeft: '1px solid #C9C9C9',
    marginRight: '2px',
    minWidth: '682px !important', /* Eight columns at 1024px screen size */
    overflowY: 'auto',
    [theme.breakpoints.up('md')]: {
      marginBottom: '80px',
    },
    [theme.breakpoints.down('sm')]: {
      marginBottom: '28px',
    },
  },
  menuHeader: {
    padding: '2.5rem 2.5rem 1.2rem 2.5rem',
    margin: 0,
  },
  fullWidth: {
    width: '100%',
  },
  toolbarWrapper: {
    padding: '24px 12px 0 12px',
    marginRight: '2px',
    overflowY: 'auto',
    [theme.breakpoints.up('md')]: {
      marginBottom: '80px',
    },
    [theme.breakpoints.down('sm')]: {
      marginBottom: '28px',
    },
  },
  rightDrawerWrapper: {
    position: 'relative',
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

  constructor(props: IFormDesignerProps) {
    super(props);
    this.state = {
      codeEditorOpen: false,
      codeEditorMode: null,
      menuOpen: false,
    };
  }

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
  public toggleMenu = () => {
    this.setState({
      menuOpen: !this.state.menuOpen,
    });
  }

  public toggleCodeEditor = (mode?: LogicMode) => {
    this.setState((prevState: IFormDesignerState) => {
      return {
        codeEditorOpen: !prevState.codeEditorOpen,
        codeEditorMode: mode ? mode : null,
      };
    });
  }

  public getDataModelSuggestions = (filterText: string): IDataModelFieldElement[] => {
    return filterDataModelForIntellisense(this.props.dataModel, filterText);
  }

  public getEditorHeight = () => {
    const height = document.getElementById('formFillerGrid').clientHeight;
    const editorHeight = height - 20;
    return editorHeight.toString();
  }

  public renderLogicEditor = () => {
    const { classes } = this.props;
    return (
      <Drawer
        anchor='bottom'
        open={this.state.codeEditorOpen}
        classes={{ paper: classNames(classes.drawerRoot) }}
      >
        <FileEditor
          editorHeight={this.getEditorHeight()}
          mode={this.state.codeEditorMode.toString()}
          closeFileEditor={this.toggleCodeEditor}
          getDataModelSuggestions={this.getDataModelSuggestions}
          boxShadow={true}
        />
      </Drawer>
    );
  }

  public render() {
    const { classes } = this.props;
    return (
      <div className={classes.root}>
        <Grid
          container={true}
          wrap={'nowrap'}
          spacing={0}
          classes={{ container: classNames(classes.container) }}
          id='formFillerGrid'
        >
          <Grid item={true} xs={2} className={classes.toolbarWrapper} classes={{ item: classNames(classes.item) }}>
            <Toolbar />
          </Grid>
          <Grid item={true} xs={8} className={classes.mainContent} classes={{ item: classNames(classes.item) }}>
            <VersionControlHeader language={this.props.language} />
            <div
              style={{
                width: 'calc(100% - 48px)',
                paddingTop: '24px',
                marginLeft: '24px',
              }}
            >
              <DesignView />
              {this.state.codeEditorOpen ?
                this.renderLogicEditor()
                : null}
            </div>
          </Grid>
          <Grid
            item={true}
            xs={2}
            classes={{ item: classNames(classes.item) }}
          >
            <ServiceLogicMenu
              open={this.state.menuOpen}
              openCloseHandler={this.toggleMenu}
              button={
                <Grid
                  container={true}
                  direction={'column'}
                  justify={'center'}
                  alignItems={'flex-end'}
                  classes={classes.menuWrapper}
                >
                  <IconButton
                    type='button'
                    className={this.props.classes.button}
                  >
                    <i
                      className={
                        (this.state.menuOpen ? this.props.classes.icon + ' ' + this.props.classes.iconActive :
                          this.props.classes.icon) + ' fa fa-logikkutensirkel'
                      }
                    />
                  </IconButton>
                </Grid>}
            >
              <div className={this.props.classes.fullWidth}>
                <h3 className={this.props.classes.menuHeader}>
                  {this.props.language.ux_editor.service_logic}
                </h3>
                <CollapsableMenuComponent
                  header={this.props.language.ux_editor.service_logic_validations}
                  listItems={[
                    {
                      name: this.props.language.ux_editor.service_logic_edit_validations,
                      action: this.toggleCodeEditor.bind(this, 'Validation'),
                    },
                  ]}
                />
                <CollapsableMenuComponent
                  header={this.props.language.ux_editor.service_logic_dynamics}
                  listItems={[
                    {
                      name: this.props.language.ux_editor.service_logic_edit_dynamics,
                      action: this.toggleCodeEditor.bind(this, 'Dynamics'),
                    }]}
                >
                  <RuleModalComponent />
                  <ConditionalRenderingModalComponent />
                </CollapsableMenuComponent>
                <CollapsableMenuComponent
                  header={this.props.language.ux_editor.service_logic_calculations}
                  listItems={[
                    {
                      name: this.props.language.ux_editor.service_logic_edit_calculations,
                      action: this.toggleCodeEditor.bind(this, 'Calculation'),
                    },
                  ]}
                />
                <div className={this.props.classes.divider} />
              </div>
            </ServiceLogicMenu >
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
    dataModel: state.appData.dataModel.model,
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
