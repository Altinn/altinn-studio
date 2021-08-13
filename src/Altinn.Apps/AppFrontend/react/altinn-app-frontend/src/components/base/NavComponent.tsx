import * as React from 'react';
import { Grid, makeStyles } from '@material-ui/core';
import { useDispatch, useSelector } from 'react-redux';
import { IRuntimeState, Triggers } from 'src/types';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';

const useStyles = makeStyles({
  ul: {
    backgroundColor: "#0062BA", 
    height: '50px', 
    listStyleType: 'none',
    textDecoration: 'none!important' as 'none'
  },
  li: {
    float: 'left', 
    borderRight: '1px solid #bbb',
    '&:hover': {
      background: "#3494eb",
    }
  },
  a: {
    display: 'block', 
    color: 'white', 
    textAlign: "center", 
    padding: '14px 16px', 
    borderBottom: '0'
  }
});

export interface INavComponent {
  id: string;
  showBackButton: boolean;
  textResourceBindings: any;
  triggers?: Triggers[];
}

export function NavComponent(props: INavComponent) {
  const classes = useStyles();
  const dispatch = useDispatch();
  const orderedLayoutKeys = useSelector((state: IRuntimeState) => state.formLayout.uiConfig.layoutOrder);
  const returnToView = useSelector((state: IRuntimeState) => state.formLayout.uiConfig.returnToView);
  const pageTriggers = useSelector((state: IRuntimeState) => state.formLayout.uiConfig.pageTriggers);
  const triggers = props.triggers || pageTriggers;

  const OnClickNav = (index: string) => {
    const runPageValidations = !returnToView && triggers?.includes(Triggers.ValidatePage);
    const runAllValidations = returnToView || triggers?.includes(Triggers.ValidateAllPages);
    const runValidations = (runAllValidations && 'allPages') || (runPageValidations && 'page') || null;
    dispatch(FormLayoutActions.updateCurrentView({ newView: index, runValidations }));
  };
 
  const pageList = orderedLayoutKeys.map((x) => 
    <li className={classes.li}><a className={classes.a} href="#" onClick={() => OnClickNav(x)}>{x}</a></li>
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
