import React, { useEffect, useState } from 'react';
import { createTheme, Drawer, Grid, Theme, Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';
import classNames from 'classnames';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useDispatch, useSelector } from 'react-redux';
import FileEditor from 'app-shared/file-editor/FileEditor';
import altinnTheme from 'app-shared/theme/altinnStudioTheme';
import RightMenu from '../components/rightMenu/RightMenu';
import { filterDataModelForIntellisense } from '../utils/datamodel';
import { DesignView } from './DesignView';
import { Toolbar } from './Toolbar';
import { fetchServiceConfiguration } from '../features/serviceConfigurations/serviceConfigurationSlice';
import { FormLayoutActions } from '../features/formDesigner/formLayout/formLayoutSlice';
import type {
  IAppState,
  IDataModelFieldElement,
  LogicMode,
} from '../types/global';
import { makeGetLayoutOrderSelector } from '../selectors/getLayoutData';

const useTheme = createTheme(altinnTheme);

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    flexGrow: 1,
    overflowY: 'hidden',
    height: '100%',
  },
  drawerRoot: {
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
    height: '100%',
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
    minWidth: '240px' /* Two columns at 1024px screen size */,
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
    minWidth: '682px !important' /* Eight columns at 1024px screen size */,
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
  pageHeader: {
    marginLeft: 24,
    marginTop: 12,
  },
  pageHeaderText: {
    fontSize: 18,
    fontWeight: 500,
  },
}));

function FormDesigner() {
  const classes = useStyles(useTheme);
  const dispatch = useDispatch();

  const [codeEditorOpen, setCodeEditorOpen] = useState<boolean>(false);
  const [codeEditorMode, setCodeEditorMode] = useState<LogicMode>(null);

  const selectedLayout: string = useSelector(
    (state: IAppState) => state.formDesigner.layout.selectedLayout,
  );
  const language = useSelector(
    (state: IAppState) => state.appData.languageState.language,
  );
  const dataModel = useSelector(
    (state: IAppState) => state.appData.dataModel.model,
  );

  useEffect(() => {
    dispatch(FormLayoutActions.fetchFormLayout());
    dispatch(fetchServiceConfiguration());
  }, [dispatch]);

  const toggleCodeEditor = (mode?: LogicMode) => {
    setCodeEditorOpen(!codeEditorOpen);
    setCodeEditorMode(mode || null);
  };

  const getDataModelSuggestions = (
    filterText: string,
  ): IDataModelFieldElement[] => {
    return filterDataModelForIntellisense(dataModel, filterText);
  };

  const getEditorHeight = () => {
    const height = document.getElementById('formFillerGrid').clientHeight;
    const editorHeight = height - 20;
    return editorHeight.toString();
  };

  const renderLogicEditor = () => {
    return (
      <Drawer
        anchor='bottom'
        open={codeEditorOpen}
        classes={{ paper: classNames(classes.drawerRoot) }}
      >
        <FileEditor
          editorHeight={getEditorHeight()}
          mode={codeEditorMode.toString()}
          closeFileEditor={toggleCodeEditor}
          getDataModelSuggestions={getDataModelSuggestions}
          boxShadow={true}
        />
      </Drawer>
    );
  };

  const activeList = useSelector(
    (state: IAppState) => state.formDesigner.layout.activeList,
  );
  const layoutOrder = useSelector((state: IAppState) =>
    JSON.parse(
      JSON.stringify(
        state.formDesigner.layout.layouts[
          state.formDesigner.layout.selectedLayout
        ]?.order || {},
      ),
    ),
  );

  const order = useSelector((state: IAppState) =>
    makeGetLayoutOrderSelector()(state),
  );

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
            item={true}
            xs={2}
            className={classes.toolbarWrapper}
            classes={{ item: classNames(classes.item) }}
          >
            <Toolbar />
          </Grid>
          <Grid
            item={true}
            xs={8}
            className={classes.mainContent}
            classes={{ item: classNames(classes.item) }}
          >
            <div className={classes.pageHeader}>
              <Typography classes={{ root: classes.pageHeaderText }}>
                {`Side - ${selectedLayout}`}
              </Typography>
            </div>
            <div
              style={{
                width: 'calc(100% - 48px)',
                paddingTop: '12px',
                marginLeft: '24px',
              }}
            >
              <DesignView
                order={order}
                activeList={activeList}
                isDragging={false}
                layoutOrder={layoutOrder}
              />
              {codeEditorOpen ? renderLogicEditor() : null}
            </div>
          </Grid>
          <Grid item={true} xs={2} classes={{ item: classNames(classes.item) }}>
            <RightMenu
              toggleFileEditor={toggleCodeEditor}
              language={language}
            />
          </Grid>
        </Grid>
      </div>
    </DndProvider>
  );
}

export default FormDesigner;
