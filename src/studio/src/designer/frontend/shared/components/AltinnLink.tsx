import React from 'react';
import { createTheme } from '@mui/material';
import { withStyles } from '@mui/styles';
import altinnTheme from '../theme/altinnStudioTheme';
import AltinnIcon from './AltinnIcon';

export interface IAltinnLinkComponentProvidedProps {
  classes: any;
  url: string;
  linkTxt: string;
  openInNewTab?: boolean;
  shouldShowIcon: boolean;
}

const theme = createTheme(altinnTheme);

const styles = {
  link: {
    borderBottom: `1px solid ${theme.altinnPalette.primary.blueDark}`,
    color: theme.altinnPalette.primary.blueDarker,
    '&:hover': {
      fontWeight: 500,
      textDecoration: 'none',
      color: theme.altinnPalette.primary.blueDarker,
      borderBottom: `1px solid ${theme.altinnPalette.primary.blueMedium}`,
    },
  },
};

const AltinnLink = (props: IAltinnLinkComponentProvidedProps) => {
  const { classes, openInNewTab } = props;
  return (
    <a
      href={props.url}
      className={classes.link}
      target={openInNewTab ? '_blank' : ''}
      rel='noreferrer'
    >
      {props.linkTxt}
      {props.shouldShowIcon && (
        <AltinnIcon
          isActive={false}
          iconClass='ai ai-arrowrightup'
          iconColor={theme.altinnPalette.primary.black}
          iconSize={20}
          margin='5px'
        />
      )}
    </a>
  );
};

export default withStyles(styles)(AltinnLink);
