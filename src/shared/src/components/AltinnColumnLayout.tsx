import { createTheme, createStyles, Grid, Typography, withStyles, WithStyles } from '@material-ui/core';
import classNames from 'classnames';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme';

const theme = createTheme(altinnTheme);

const styles = createStyles({
  mainStyle: {
    paddingLeft: 60,
    paddingRight: 60,
    width: '100%',
  },
  headerStyle: {
    fontSize: 36,
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
    wordBreak: 'break-word',
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
    marginTop: 30,
  },
  marginBottom_24: {
    marginBottom: 24,
  },
});

export interface IAltinnColumnLayoutProps  extends WithStyles<typeof styles> {
  /** Children rendered as main content */
  children: any;
  /** Children rendered in the side menu */
  sideMenuChildren: any;
  /** Children rendered above the colum layout itself */
  aboveColumnChildren?: any;
  /** The header displayed above the main content */
  header: string;
  /** @ignore */
  classes: any;
}

export class AltinnColumnLayout extends React.Component<IAltinnColumnLayoutProps> {
  public render() {
    const { classes } = this.props;
    return (
      <>
        {this.props.aboveColumnChildren}
        <div className={classes.mainLayout} id={'altinn-column-layout-container'}>
          <Grid container={true} className={classes.layout} >
            <Grid item={true} md={8}>
              <Grid item={true} md={12} className={classes.mainStyle}>
                <Typography id={'altinn-column-layout-header'} className={classes.headerStyle}>
                  {this.props.header}
                </Typography>
              </Grid>
              <Grid id={'altinn-column-layout-main-content'} item={true} md={12} className={classes.mainStyle}>
                {this.props.children}
              </Grid>
            </Grid>
            <Grid id={'altinn-column-layout-side-menu'} item={true} md={4} className={classNames(classes.sidebar)}>
              {this.props.sideMenuChildren}
            </Grid>
          </Grid>
        </div>
      </>
    );
  }
}
export default withStyles(styles)(AltinnColumnLayout);
