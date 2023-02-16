import React from 'react';

import { Grid, makeStyles } from '@material-ui/core';
import classNames from 'classnames';

import { getLanguageFromKey } from 'src/language/sharedLanguage';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import type { ILanguage } from 'src/types/shared';

const useStyles = makeStyles({
  banner: {
    margin: '-36px -24px 36px -24px',
    padding: '10px 24px',
    '@media (min-width:768px)': {
      margin: '-36px -84px 36px -84px',
      padding: '10px 84px',
    },
    '@media (min-width:993px)': {
      margin: '-36px -96px 36px -96px',
      padding: '10px 96px',
    },
  },
  default: {
    backgroundColor: AltinnAppTheme.altinnPalette.primary.greyLight,
  },
  error: {
    backgroundColor: AltinnAppTheme.altinnPalette.primary.redLight,
  },
});

interface IMessageBannerProps {
  language: ILanguage;
  error?: boolean;
  messageKey: string;
}

export function MessageBanner({ language, error, messageKey }: IMessageBannerProps) {
  const classes = useStyles();

  return (
    <Grid
      id='MessageBanner-container'
      item={true}
      className={classNames(classes.banner, error ? classes.error : classes.default)}
      data-testid='MessageBanner-container'
    >
      <span>{getLanguageFromKey(messageKey, language)}</span>
    </Grid>
  );
}
