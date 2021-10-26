import * as React from 'react';
import { Grid, makeStyles, createMuiTheme } from '@material-ui/core';
import { useDispatch, useSelector } from 'react-redux';
import { IRuntimeState, Triggers } from 'src/types';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { getTextResource } from '../../utils/formComponentUtils';
import { AltinnAppTheme } from 'altinn-shared/theme';

const theme = createMuiTheme(AltinnAppTheme);

const useStyles = makeStyles({
  menu: {
    marginBottom: '6px!important',
    listStyleType: 'none',
    textDecoration: 'none!important',
    paddingLeft: '0px!important',
    position: 'relative'
  },
  menuMobile: {
    height: '200px'
  },
  buttons: {
    float: 'left', 
    border: '2px solid #008FD6',
    '&:hover': {
      border: '3px solid #008FD6'
    },
    borderRadius: '40px',
    marginRight: '20px',
    "&:active": {
      backgroundColor: "#0062BA"
    },
    [theme.breakpoints.down(600)]: {
      float: 'none',
      display: 'none'
    }
  },
  buttonsMobile: {
    marginBottom: '6px',
    border: '2px solid #008FD6',
    '&:hover': {
      border: '3px solid #008FD6'
    },
    borderRadius: '40px',
    marginRight: '20px',
    "&:active": {
      backgroundColor: "#0062BA"
    },
    [theme.breakpoints.up(600)]: {
      float: 'none',
      display: 'none'
    }
  },
  selectedBtn: {
    float: 'left', 
    border: '2px solid #008FD6',
    '&:hover': {
      border: '3px solid #008FD6'
    },
    borderRadius: '40px',
    marginRight: '20px',
    backgroundColor: "#022f51",
    [theme.breakpoints.down(600)]: {
      float: 'none',
      display: 'none'
    }
  },
  selectedBtnMobile: {
    marginBottom: '6px',
    border: '2px solid #008FD6',
    '&:hover': {
      border: '3px solid #008FD6'
    },
    borderRadius: '40px',
    marginRight: '20px',
    backgroundColor: "#022f51",
    [theme.breakpoints.up(600)]: {
      float: 'none',
      display: 'none'
    }
  },
  navMobile: {
    border: '2px solid #008FD6',
    '&:hover': {
      border: '3px solid #008FD6'
    },
    borderRadius: '40px',
    marginRight: '20px',
    backgroundColor: "#022f51",
    [theme.breakpoints.up(600)]: {
      float: 'none',
      display: 'none'
    }
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
    display: 'block',   
    textAlign: "center", 
    padding: '12px', 
    borderBottom: '0',
    color: 'white!important',
    "&:hover": {
      borderBottom: "0px solid rgba(0,0,0,0)"
    },
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
  const showMenu: boolean = useSelector((state: IRuntimeState) => state.formLayout.uiConfig.showMenu);

  const OnClickNav = (index: string) => {
    const runPageValidations = !returnToView && triggers?.includes(Triggers.ValidatePage);
    const runAllValidations = returnToView || triggers?.includes(Triggers.ValidateAllPages);
    const runValidations = (runAllValidations && 'allPages') || (runPageValidations && 'page') || null;

    dispatch(FormLayoutActions.updateCurrentView({ newView: index, runValidations }));
  };

  const NavBar = () => {

    const pageList = orderedLayoutKeys.map((item) => 
      <li className={ currentView == item ? classes.selectedBtn : classes.buttons } >
          <a className={ currentView == item ? classes.btnTextSelected : classes.btnText } 
              onClick={() => OnClickNav(item)}
              aria-current={currentView == item ? 'page' : null}>
              {getTextResource(item, textResources)}
          </a>
      </li>
    );

    if(!showMenu) {
      pageList.unshift(
        <li className={ classes.navMobile } >
          <a className={ classes.btnTextSelected } 
              onClick={() => dispatch(FormLayoutActions.updateMenu({showMenu: !showMenu}))}>
                {orderedLayoutKeys.indexOf(currentView) + 1} / {pageList.length} {getTextResource(currentView, textResources)}
                <i className={'ai ai-expand'} />
            </a>
            
        </li>  
      );
    }

    const pageListMobile = orderedLayoutKeys.map((item) => 
      <li className={ currentView == item ? classes.selectedBtnMobile : classes.buttonsMobile } >
          <a className={ currentView == item ? classes.btnTextSelected : classes.btnText } 
              onClick={ currentView == item ? () => dispatch(FormLayoutActions.updateMenu({showMenu: !showMenu})) : () => OnClickNav(item) }
              aria-current={currentView == item ? 'page' : null}>
                {getTextResource(item, textResources)}
          </a>
      </li>
    );

    return (
      <div>
        {<ul className={ classes.menu }>{pageList}</ul>}
        {showMenu && <ul className={`${classes.menu} ${classes.menuMobile}`}>{pageListMobile}</ul> }
        
      </div>
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
