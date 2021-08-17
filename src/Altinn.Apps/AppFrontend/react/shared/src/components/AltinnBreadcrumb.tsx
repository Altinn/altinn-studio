import { createTheme, Grid, Typography } from '@material-ui/core';
import { createStyles, withStyles, WithStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme';

export interface IAltinnBreadcrumbComponentProvidedProps extends WithStyles<typeof styles> {
  /** @ignore */
  classes: any;
  firstLink: string;
  secondLink?: any;
  firstLinkTxt?: any;
  secondLinkTxt?: boolean;
  /** ClassName prop is used to pass in optional Material-UI createStyles classes object */
  className?: any;
}

export interface IAltinnBreadcrumbComponentState {
}

const theme = createTheme(altinnTheme);

const styles = () => createStyles({
  link: {
    'fontWeight': 600,
    'paddingBottom': '2px',
    'color': '#000000',
    'textDecoration': 'none',
    'borderBottom': '2px solid ' + theme.altinnPalette.primary.blueDark,
    'paddingRight': '5px',
    'paddingLeft': '5px',
    '&:focus': {
      color: theme.altinnPalette.primary.blueDark,
      textDecoration: 'none',
    },
    '&:hover': {
      color: theme.altinnPalette.primary.blueDark,
      textDecoration: 'none',
    },
  },
  sidePadding: {
    paddingRight: '5px',
    paddingLeft: '5px',
  },
});

export class AltinnBreadcrumb extends
  React.Component<IAltinnBreadcrumbComponentProvidedProps, IAltinnBreadcrumbComponentState> {

  public render() {
    const { classes } = this.props;
    return (
      <Grid item={true} className={classNames(this.props.className)}>
        <Typography>
          {this.props.firstLink ?
            <a href={this.props.firstLink} className={classes.link}>
              {this.props.firstLinkTxt}
            </a>
            :
            <span className={classes.sidePadding}>{this.props.firstLinkTxt}</span>
          } <span className={classes.sidePadding}>/</span> {
            this.props.secondLink ?
              <a href={this.props.secondLink} className={classes.link}>
                {this.props.secondLinkTxt}
              </a>
              :
              <span className={classes.sidePadding}>{this.props.secondLinkTxt}</span>
          }
        </Typography>
      </Grid>
    );
  }
}

export default withStyles(styles)(AltinnBreadcrumb);
