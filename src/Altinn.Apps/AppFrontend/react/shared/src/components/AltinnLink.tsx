import { createTheme } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import * as React from 'react';
import altinnTheme from '../theme/altinnStudioTheme';
import AltinnIconComponent from './AltinnIcon';

export interface IAltinnLinkCompontentProvidedProps {
  classes: any;
  url: string;
  linkTxt: string;
  openInNewTab?: boolean;
  shouldShowIcon: boolean;
}

const theme = createTheme(altinnTheme);

const styles = {
  link: {
    'borderBottom': '1px solid ' + theme.altinnPalette.primary.blueDark,
    'color': theme.altinnPalette.primary.blueDarker,
    '&:hover': {
      fontWeight: 500,
      textDecoration: 'none',
      color: theme.altinnPalette.primary.blueDarker,
      borderBottom: '1px solid' + theme.altinnPalette.primary.blueMedium,
    },
  },
};

export class AltinnLink extends React.Component<IAltinnLinkCompontentProvidedProps> {
  public render() {
    const { classes, openInNewTab } = this.props;
    return (
      <a href={this.props.url} className={classes.link} target={openInNewTab ? '_blank' : ''} rel="noreferrer">
        {this.props.linkTxt}
        {this.props.shouldShowIcon &&
          <AltinnIconComponent
            isActive={false}
            iconClass='ai ai-arrowrightup'
            iconColor={theme.altinnPalette.primary.black}
            iconSize={20}
            margin={'5px'}
          />
        }
      </a>
    );
  }
}

export default withStyles(styles)(AltinnLink);
