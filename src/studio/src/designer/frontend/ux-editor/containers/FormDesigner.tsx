/* eslint-disable import/no-cycle */
import { createStyles, Drawer, Grid, Theme, Typography, withStyles } from '@material-ui/core';
import classNames from 'classnames';
import * as React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { connect } from 'react-redux';
import FileEditor from 'app-shared/file-editor/FileEditor';
import altinnTheme from 'app-shared/theme/altinnStudioTheme';
import VersionControlHeader from 'app-shared/version-control/versionControlHeader';
import RightMenu from '../components/rightMenu/RightMenu';
import AppDataActionDispatcher from '../actions/appDataActions/appDataActionDispatcher';
import FormDesignerActionDispatchers from '../actions/formDesignerActions/formDesignerActionDispatcher';
import ManageServiceConfigurationDispatchers from '../actions/manageServiceConfigurationActions/manageServiceConfigurationActionDispatcher';
import { filterDataModelForIntellisense } from '../utils/datamodel';
import DesignView from './DesignView';
import { Toolbar } from './Toolbar';

export interface IFormDesignerProvidedProps {
  classes: any;
}
export interface IFormDesignerProps extends IFormDesignerProvidedProps {
  language: any;
  dataModel: IDataModelFieldElement[];
  components: any;
  activeList: any;
  selectedLayout: string;
}

export interface IFormDesignerState {
  codeEditorOpen: boolean;
  codeEditorMode: LogicMode;
}

const styles = ((theme: Theme) => createStyles({
  root: {
    [theme.breakpoints.up('md')]: {
      paddingLeft: theme.sharedStyles.mainPaddingLeft,
    },
    flexGrow: 1,
    height: 'calc(100vh - 110px)',
    overflowY: 'hidden',
  },
  drawerRoot: {
    height: '100vh',
    overflow: 'hidden',
  },
  button: {
    top: '112px',
    position: 'absolute',
    zIndex: 1201,
    padding: '1.2rem 0.6rem',
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
    overflowX: 'hidden',
  },
  icon: {
    lineHeight: '3rem !important',
    fontSize: '3rem',
    border: `0.1rem solid ${altinnTheme.altinnPalette.primary.blueDark}`,
    color: altinnTheme.altinnPalette.primary.blueDark,
    borderRadius: '50%',
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
    overflowY: 'scroll',
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
  versionControlHeaderMargin: {
    marginLeft: 24,
  },
  pageHeader: {
    marginLeft: 24,
    marginTop: 12,
  },
  pageHeaderText: {
    fontSize: 18,
    fontWeight: 500,
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
    };
  }

  public componentDidMount() {
    const { org, app } = window as Window as IAltinnWindow;
    const appId = `${org}/${app}`;

    FormDesignerActionDispatchers.fetchFormLayout(
      `${window.location.origin}/designer/${appId}/UIEditor/GetFormLayout`,
    );
    AppDataActionDispatcher.setDesignMode(true);
    ManageServiceConfigurationDispatchers.fetchJsonFile(
      `${window.location.origin}/designer/${
        appId}/UIEditor/GetJsonFile?fileName=RuleConfiguration.json`,
    );
  }

  public toggleCodeEditor = (mode?: LogicMode) => {
    this.setState((prevState: IFormDesignerState) => {
      return {
        codeEditorOpen: !prevState.codeEditorOpen,
        codeEditorMode: mode || null,
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
      <DndProvider backend={HTML5Backend}>
        <div className={classes.root}>
          <Grid
            container={true}
            wrap='nowrap'
            spacing={0}
            classes={{ container: classNames(classes.container) }}
            id='formFillerGrid'
          >
            <Grid
              item={true} xs={2}
              className={classes.toolbarWrapper} classes={{ item: classNames(classes.item) }}
            >
              <Toolbar />
            </Grid>
            <Grid
              item={true} xs={8}
              className={classes.mainContent} classes={{ item: classNames(classes.item) }}
            >
              <div className={classes.versionControlHeaderMargin}>
                <VersionControlHeader language={this.props.language} />
              </div>
              <div className={classes.pageHeader}>
                <Typography classes={{ root: classes.pageHeaderText }}>
                  {`Side - ${this.props.selectedLayout}`}
                </Typography>
              </div>
              <div
                style={{
                  width: 'calc(100% - 48px)',
                  paddingTop: '12px',
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
              <RightMenu
                toggleFileEditor={this.toggleCodeEditor}
                language={this.props.language}
              />
            </Grid>
          </Grid>
        </div>
      </DndProvider>
    );
  }
}

const mapsStateToProps = (
  state: IAppState,
  props: IFormDesignerProvidedProps,
): IFormDesignerProps => {
  return {
    classes: props.classes,
    components: state.formDesigner.layout.layouts[state.formDesigner.layout.selectedLayout]?.components,
    activeList: state.formDesigner.layout.activeList,
    language: state.appData.language.language,
    dataModel: state.appData.dataModel.model,
    selectedLayout: state.formDesigner.layout.selectedLayout,
  };
};

export default withStyles(
  styles,
  { withTheme: true },
)(
  connect(
    mapsStateToProps,
  )(
    FormDesigner,
  ),
);
