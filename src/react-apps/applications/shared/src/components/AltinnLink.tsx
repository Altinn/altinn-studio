import { createMuiTheme } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme';

export interface IAltinnLinkCompontentProvidedProps {
  classes: any;
  url: string;
  linkTxt: string;
}

export interface IAltinnLinkComponentState {
}
const theme = createMuiTheme(altinnTheme);

const styles = {
  link: {
    'borderBottom': '1px solid ' + theme.altinnPalette.primary.blueDark,
    'color': theme.altinnPalette.primary.blueDarker,
    '&:hover': {
      fontWeight: 500,
      textDecoration: 'none',
      color: theme.altinnPalette.primary.blueDarker,
      borderBottom: '1px solid' + theme.altinnPalette.primary.blueDark,
    },
  },
};

// tslint:disable-next-line:max-line-length
class AltinnLink extends React.Component<IAltinnLinkCompontentProvidedProps, IAltinnLinkComponentState> {
  public render() {
    const { classes } = this.props;
    return (
      <a href={this.props.url} className={classes.link}>
        {this.props.linkTxt}
        {this.props.children}
      </a>
    );
  }
}

export default withStyles(styles)(AltinnLink);
