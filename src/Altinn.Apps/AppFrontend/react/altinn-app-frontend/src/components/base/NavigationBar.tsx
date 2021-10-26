import * as React from 'react';
import { Grid, makeStyles, createMuiTheme } from '@material-ui/core';
import { useDispatch, useSelector } from 'react-redux';
import { IRuntimeState, Triggers } from 'src/types';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { getTextResource } from '../../utils/formComponentUtils';
import { AltinnAppTheme } from 'altinn-shared/theme';
import classNames from 'classnames';
import { useState } from 'react';

const theme = createMuiTheme(AltinnAppTheme);

const useStyles = makeStyles({
  menu: {
    marginBottom: '6pxt',
    listStyleType: 'none',
    textDecoration: 'nonet',
    paddingLeft: '0pxt',
    position: 'relative'
  },
  menuMobile: {
    height: '200px'
  },
  buttons: {
    border: '2px solid #008FD6',
    borderRadius: '40px',
    marginRight: '20px',
    '&:hover': {
      border: '3px solid #008FD6'
    }
  },
  aColor: {
    "&:active": {
      backgroundColor: "#0062BA"
    }
  },
  bpDown: {
    [theme.breakpoints.down(600)]: {
      float: 'none',
      display: 'none'
    }
  },
  bpUp: {
    [theme.breakpoints.up(600)]: {
      float: 'none',
      display: 'none'
    }
  },
  buttonsDesktop: {
    float: 'left'
  },
  buttonsSmallScreen: {
    marginBottom: '6px'
  },
  selectedBtn: {
    float: 'left', 
    backgroundColor: "#022f51"
  },
  selectedBtnMobile: {
    marginBottom: '6px',
    backgroundColor: "#022f51"
  },
  navMobile: {
    backgroundColor: "#022f51"
  },
  btnText: {
    display: 'block', 
    textAlign: "center", 
    padding: '12px', 
    borderBottom: '0',
    "&:hover": {
      borderBottom: "0px solid rgba(0,0,0,0)"
    }
  },
  btnTextSelected: {
    color: 'white!important',
    width: '100%',
    fontSize: '1.5rem'
  }
});

export interface INavigationBar {
  id: string;
  showBackButton: boolean;
  textResourceBindings: any;
  triggers?: Triggers[];
}

export function NavigationBar(props: INavigationBar) {
  const classes = useStyles();
  const dispatch = useDispatch();
  const orderedLayoutKeys = useSelector((state: IRuntimeState) => state.formLayout.uiConfig.layoutOrder);
  const returnToView = useSelector((state: IRuntimeState) => state.formLayout.uiConfig.returnToView);
  const pageTriggers = useSelector((state: IRuntimeState) => state.formLayout.uiConfig.pageTriggers);
  const triggers = props.triggers || pageTriggers;
  const textResources = useSelector((state: IRuntimeState) => state.textResources.resources);
  const currentView: string = useSelector((state: IRuntimeState) => state.formLayout.uiConfig.currentView);
  const [showMenu, setShowMenu] = useState( false );

  const OnClickNav = (index: string) => {
    const runPageValidations = !returnToView && triggers?.includes(Triggers.ValidatePage);
    const runAllValidations = returnToView || triggers?.includes(Triggers.ValidateAllPages);
    const runValidations = (runAllValidations && 'allPages') || (runPageValidations && 'page') || null;

    dispatch(FormLayoutActions.updateCurrentView({ newView: index, runValidations }));
  };

  const NavBar = () => {

    const pageList = orderedLayoutKeys.map((item) => 
      <li className={ classNames( classes.bpDown, classes.aColor, classes.buttons, classes.buttonsDesktop, currentView === item ? classes.selectedBtn : undefined )}>
          <a className={ classNames( classes.btnText, currentView === item ? classes.btnTextSelected : undefined )}
              onClick={() => OnClickNav(item)}
              aria-current={currentView === item ? 'page' : null}>
              {getTextResource(item, textResources)}
          </a>
      </li>
    );

    if(!showMenu) {
      pageList.unshift(
        <li className={ classNames( classes.bpUp, classes.buttons, classes.navMobile )} >
          <a className={ classNames( classes.btnText, classes.btnTextSelected)}
              onClick={() => setShowMenu(!showMenu)}>
                {orderedLayoutKeys.indexOf(currentView) + 1} / {pageList.length} {getTextResource(currentView, textResources)}
                <i className={'ai ai-expand'} />
            </a>
            
        </li>  
      );
    }

    const pageListMobile = orderedLayoutKeys.map((item) => 
      <li className={ classNames( classes.buttons, classes.buttonsSmallScreen, currentView === item ? classes.selectedBtnMobile : undefined, classes.aColor, classes.bpUp)}>
          <a className={ classNames( classes.btnText, currentView === item ? classes.btnTextSelected : undefined )}
              onClick={ currentView === item ? () => setShowMenu(!showMenu) : () => OnClickNav(item) }
              aria-current={currentView === item ? 'page' : null}>
                {getTextResource(item, textResources)}
          </a>
      </li>
    );

    return (
      <nav>
        {<ul className={ classes.menu }>{pageList}</ul>}
        {showMenu && <ul className={`${classes.menu} ${classes.menuMobile}`}>{pageListMobile}</ul> }
        
      </nav>
    );
  };

  return (
    <Grid
      container={true}
      justify='space-between'
    >
      <Grid item={true} xs={10}>
        <NavBar />
      </Grid>
    </Grid>
  );
}
