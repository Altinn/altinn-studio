import { createMuiTheme, createStyles, Grid, Typography, withStyles } from '@material-ui/core';
import * as React from 'react';
import { connect } from 'react-redux';
import altinnTheme from '../../../../../shared/src/theme/altinnStudioTheme';
import { getLanguageFromKey } from '../../../../../shared/src/utils/language';
import VersionControlHeader from '../../../../../shared/src/version-control/versionControlHeader';

const theme = createMuiTheme(altinnTheme);

const styles = createStyles({
  mainStyle: {
    paddingLeft: 60,
    paddingRight: 60,
  },
  headerStyle: {
    fontSize: 36,
    marginTop: 30,
    marginBottom: 30,
  },
  sidebar: {
    [theme.breakpoints.down('md')]: {
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

export interface IAccessControlContainerProvidedProps {
  classes: any;
}

export interface IAccessControlContainerProps extends IAccessControlContainerProvidedProps {
  language: any;
}

export class AccessControlContainerClass extends React.Component<IAccessControlContainerProps> {
  public render() {
    const { classes } = this.props;
    return (
      <div className={classes.mainLayout}>
        <VersionControlHeader language={this.props.language} />
        <Grid container={true} className={classes.layout}>
          <Grid item={true} className={classes.mainStyle} md={12}>
            <Typography className={classes.headerStyle}>
              {getLanguageFromKey('access_control.header', this.props.language)}
            </Typography>
          </Grid>
          <Grid item={true} className={classes.mainLayout} md={8}>
            Placeholder
          </Grid>
          <Grid item={true} className={classes.sidebar} md={4}>
            <Typography className={classes.sidebarHeader}>
              Om tilgang
              </Typography>
            <Typography className={classes.sidebarInfoText}>
              Test av initiering
              </Typography>
          </Grid>
        </Grid>
      </div>
    );
  }
}

const mapStateToProps = (
  state: IServiceDevelopmentState,
  props: IAccessControlContainerProvidedProps,
): IAccessControlContainerProps => {
  return {
    language: state.language.language,
    ...props,
  };
};

export default withStyles(styles)(connect(mapStateToProps)(AccessControlContainerClass));
