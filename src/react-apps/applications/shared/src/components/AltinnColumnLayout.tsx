import { createMuiTheme, createStyles, Grid, Typography, withStyles } from '@material-ui/core';
import classNames = require('classnames');
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme';

const theme = createMuiTheme(altinnTheme);

const styles = createStyles({
  mainStyle: {
    paddingLeft: 60,
    paddingRight: 60,
    width: '100%',
    height: '100%',
  },
  headerStyle: {
    fontSize: 36,
    marginTop: 30,
    marginBottom: 30,
  },
  sidebar: {
    [theme.breakpoints.up('md')]: {
      borderLeft: '1px solid ' + theme.altinnPalette.primary.greyMedium,
      paddingLeft: 10,
    },
    [theme.breakpoints.down('sm')]: {
      paddingLeft: 60,
    },
  },
  sidebarHeader: {
    marginBottom: 20,
    fontSize: 20,
    fontWeight: 500,
  },
  sidebarInfoText: {
    fontSize: 16,
  },
  iconStyling: {
    fontSize: 35,
    textAlign: 'right' as 'right',
  },
  sidebarServiceOwner: {
    marginTop: 10,
  },
  sidebarCreatedBy: {
    fontSize: 16,
    marginTop: 10,
  },
  spinnerLocation: {
    margin: 'auto',
  },
  layout: {
    paddingBottom: 50,
  },
  mainLayout: {
    [theme.breakpoints.down('sm')]: {
      height: `calc(100vh - 55px)`,
      overflowY: 'auto',
    },
    [theme.breakpoints.up('md')]: {
      height: `calc(100vh - 110px)`,
      overflowY: 'auto',
      paddingLeft: theme.sharedStyles.mainPaddingLeft,
    },
  },
  marginBottom_24: {
    marginBottom: 24,
  },
});

export interface IAltinnColumnLayoutProvidedProps {
  children: any;
  sideMenuChildren: any;
  aboveColumnChildren?: any;
  header: string;
}

export interface IAltinnColumnLayoutProps extends IAltinnColumnLayoutProvidedProps {
  classes: any;
}

export class AltinnColumnLayoutClass extends React.Component<IAltinnColumnLayoutProps> {
  public render() {
    const { classes } = this.props;
    return (
      <div className={classes.mainLayout} id={'altinn-column-layout-container'}>
        {this.props.aboveColumnChildren}
        <Grid container={true} className={classes.layout}>
          <Grid item={true} md={12} className={classes.mainStyle}>
            <Typography id={'altinn-column-layout-header'} className={classes.headerStyle}>
              {this.props.header}
            </Typography>
          </Grid>
          <Grid id={'altinn-column-layout-main-content'} item={true} md={8} className={classes.mainStyle}>
            {this.props.children}
          </Grid>
          <Grid id={'altinn-column-layout-side-menu'} item={true} md={'auto'} className={classNames(classes.sidebar)}>
            {this.props.sideMenuChildren}
          </Grid>
        </Grid>
      </div>
    );
  }
}
export default withStyles(styles)(AltinnColumnLayoutClass);
