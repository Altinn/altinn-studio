import { createMuiTheme, createStyles, withStyles } from '@material-ui/core';
import * as React from 'react';
import altinnTheme from 'app-shared/theme/altinnStudioTheme';
export interface IIFrameComponentProvidedProps {
  iframeEndingUrl: string;
  classes: any;
}

const theme = createMuiTheme(altinnTheme);

const styles = () => createStyles({
  iFrameLayout: {
    [theme.breakpoints.down('sm')]: {
      height: `calc(100vh - 55px)`,
    },
    [theme.breakpoints.up('md')]: {
      height: `calc(100vh - 110px)`,
    },
    width: '100%',
    border: 0,
  },
  mainLayout: {
    [theme.breakpoints.up('md')]: {
      paddingLeft: theme.sharedStyles.mainPaddingLeft,
    },
  },
});

export class IFrameComponent extends
  React.Component<IIFrameComponentProvidedProps, any> {

  public render() {
    const { classes } = this.props;
    const { org, app } = window as Window as IAltinnWindow;
    const url = `${window.location.origin}/designer/${org}/${app}/${this.props.iframeEndingUrl}`;
    return (
      <div className={classes.mainLayout}>
        <iframe className={classes.iFrameLayout} src={url} />
      </div>
    );
  }
}

export const IFrame = withStyles(styles)(IFrameComponent);
