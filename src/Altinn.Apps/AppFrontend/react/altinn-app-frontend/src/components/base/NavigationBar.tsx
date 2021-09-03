import * as React from 'react';
import { Grid, makeStyles } from '@material-ui/core';
import { useDispatch, useSelector } from 'react-redux';
import { IRuntimeState, Triggers } from 'src/types';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { getTextResource } from '../../utils/formComponentUtils';

const useStyles = makeStyles({
  ul: {
    height: '50px',
    listStyleType: 'none',
    textDecoration: 'none!important' as 'none',
    paddingLeft: '0px!important' as 'noPadding'
  },
  li: {
    float: 'left', 
    border: '2px solid #008FD6',
    '&:hover': {
      border: '3px solid #008FD6'
    },
    borderRadius: '20px',
    marginRight: '20px',
    "&:active": {
      backgroundColor: "#0062BA"
    }
  },
  li2: {
    float: 'left', 
    border: '2px solid #008FD6',
    '&:hover': {
      border: '3px solid #008FD6'
    },
    borderRadius: '20px',
    marginRight: '20px',
    backgroundColor: "#022f51"
  },
  a: {
    display: 'block', 
    textAlign: "center", 
    padding: '1px 10px', 
    borderBottom: '0',
    "&:hover": {
      borderBottom: "0px solid rgba(0,0,0,0)"
    }
  },
  a2: {
    display: 'block', 
    textAlign: "center", 
    padding: '1px 10px', 
    borderBottom: '0',
    color: 'white',
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

  const OnClickNav = (index: string) => {
    const runPageValidations = !returnToView && triggers?.includes(Triggers.ValidatePage);
    const runAllValidations = returnToView || triggers?.includes(Triggers.ValidateAllPages);
    const runValidations = (runAllValidations && 'allPages') || (runPageValidations && 'page') || null;
    dispatch(FormLayoutActions.updateCurrentView({ newView: index, runValidations }));
  };

  const currentView: string = useSelector((state: IRuntimeState) => state.formLayout.uiConfig.currentView);

  const pageList = orderedLayoutKeys.map((view) => 
    <li className={ currentView == view ? classes.li2 : classes.li } >
        <a className={ currentView == view ? classes.a2 : classes.a } 
          href="#" onClick={() => OnClickNav(view)}>
            {getTextResource(view, textResources)}
        </a>
    </li>
  );
  
  return (
    <Grid
      container={true}
      justify='space-between'
    >
      <Grid item={true} xs={10}>
        <ul className={ classes.ul }>{pageList}</ul>
      </Grid>
    </Grid>
  );
}
