import * as React from 'react';
import { Grid, makeStyles, createMuiTheme } from '@material-ui/core';
import { useDispatch, useSelector } from 'react-redux';
import { IRuntimeState, Triggers } from 'src/types';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { AltinnAppTheme } from 'altinn-shared/theme';
import classNames from 'classnames';
import { getTextResource } from '../../utils/formComponentUtils';

const theme = createMuiTheme(AltinnAppTheme);

const useStyles = makeStyles({
  menu: {
    marginBottom: '6px',
    listStyleType: 'none',
    textDecoration: 'none',
    paddingLeft: '0px',
    position: 'relative',
  },
  menuMobile: {
    height: '200px',
  },
  containerDesktop: {
    float: 'left',
    [theme.breakpoints.down(600)]: {
      float: 'none',
      display: 'none',
    },
  },
  containerSmallScreen: {
    marginBottom: '6px',
    [theme.breakpoints.up(600)]: {
      float: 'none',
      display: 'none',
    },
  },
  containerBase: {
    borderRadius: '40px',
    marginRight: '20px',
    '&:active': {
      backgroundColor: '#0062BA',
    },
  },
  buttonBase: {
    background: 'none',
    font: 'inherit',
    border: '2px solid #008FD6',
    width: '100%',
    height: '100%',
    display: 'block',
    textAlign: 'center',
    padding: '12px',
    borderRadius: '40px',
    '&:hover': {
      outline: '3px solid #008FD6',
    },
  },
  buttonSelected: {
    color: 'white',
    fontSize: '1.5rem',
    backgroundColor: '#022f51',
  },
});

export interface INavigationBar {
  triggers?: Triggers[];
}

export function NavigationBarComponent(props: INavigationBar) {
  const classes = useStyles();
  const dispatch = useDispatch();
  const pageIds = useSelector((state: IRuntimeState) => state.formLayout.uiConfig.layoutOrder);
  const returnToView = useSelector((state: IRuntimeState) => state.formLayout.uiConfig.returnToView);
  const pageTriggers = useSelector((state: IRuntimeState) => state.formLayout.uiConfig.pageTriggers);
  const triggers = props.triggers || pageTriggers;
  const textResources = useSelector((state: IRuntimeState) => state.textResources.resources);
  const currentPageId: string = useSelector((state: IRuntimeState) => state.formLayout.uiConfig.currentView);
  const [showMenu, setShowMenu] = React.useState(false);

  const OnClickNav = (index: string) => {
    const runPageValidations = !returnToView && triggers?.includes(Triggers.ValidatePage);
    const runAllValidations = returnToView || triggers?.includes(Triggers.ValidateAllPages);
    const runValidations = (runAllValidations && 'allPages') || (runPageValidations && 'page') || undefined;

    dispatch(FormLayoutActions.updateCurrentView({ newView: index, runValidations }));
  };

  const Button = (prop: {
    onClick: () => void,
    children: any,
    current: boolean,
  }) => (
    <button
      type='button'
      className={classNames(classes.buttonBase, prop.current && classes.buttonSelected)}
      onClick={prop.onClick}
      {...(prop.current && { 'aria-current': 'page' })}
    >
      {prop.children}
    </button>
  );

  const listPages = () => pageIds.map((pageId) => (
    <li className={classNames(classes.containerBase, classes.containerDesktop)}>
      <Button current={currentPageId === pageId} onClick={() => OnClickNav(pageId)}>
        {getTextResource(pageId, textResources)}
      </Button>
    </li>
  ));

  const pageList = showMenu ? listPages() : [
    <li className={classNames(classes.containerBase, classes.containerSmallScreen)}>
      <Button current onClick={() => setShowMenu(!showMenu)}>
        {pageIds.indexOf(currentPageId) + 1} / {pageIds.length} {getTextResource(currentPageId, textResources)}
        <i className='ai ai-expand' />
      </Button>
    </li>,
    ...listPages(),
  ];

  const renderSmallScreenMenu = () => pageIds.map((pageId) => (
    <li className={classNames(classes.containerBase, classes.containerSmallScreen)}>
      <Button
        current={currentPageId === pageId}
        onClick={currentPageId === pageId
          ? () => setShowMenu(!showMenu)
          : () => OnClickNav(pageId)}
      >
        {getTextResource(pageId, textResources)}
      </Button>
    </li>
  ));

  return (
    <Grid container>
      <Grid
        item component='nav'
        xs={10}
      >
        <ul className={classNames([classes.menu, showMenu && classes.menuMobile])}>
          {pageList}
          {showMenu && (renderSmallScreenMenu())}
        </ul>
      </Grid>
    </Grid>
  );
}
