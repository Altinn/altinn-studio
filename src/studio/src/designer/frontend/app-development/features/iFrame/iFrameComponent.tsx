import { createTheme, createStyles, withStyles } from '@material-ui/core';
import * as React from 'react';
import altinnTheme from 'app-shared/theme/altinnStudioTheme';

export interface IIFrameComponentProvidedProps {
  iframeEndingUrl: string;
  classes: any;
}

const theme = createTheme(altinnTheme);

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

export function IFrameComponent({ classes, iframeEndingUrl }: IIFrameComponentProvidedProps) {
  const { org, app } = window as Window as IAltinnWindow;
  const url = `${window.location.origin}/designer/${org}/${app}/${iframeEndingUrl}`;
  return (
    <div className={classes.mainLayout}>
      {/* eslint-disable-next-line jsx-a11y/iframe-has-title */}
      <iframe className={classes.iFrameLayout} src={url} />
    </div>
  );
}

export const IFrame = withStyles(styles)(IFrameComponent);
