import React from 'react';

import { Grid, makeStyles } from '@material-ui/core';

import { useAppSelector } from 'src/common/hooks';
import Header from 'src/shared/components/altinnAppHeader';
import { changeBodyBackground } from 'src/utils/bodyStyling';

import { AltinnAppTheme } from 'altinn-shared/theme';

const useStyles = makeStyles((theme) => ({
  instantiatePage: {
    width: '100%',
    maxWidth: '1056px',
    backgroundColor: theme.altinnPalette.primary.white,
    display: 'flex',
    flexDirection: 'column',
    alignSelf: 'center',
    padding: 12,
    'ms-flex-wrap': 'nowrap',
  },
}));

export interface IInstantiateContainerProps {
  children?: React.ReactNode;
  type: 'normal' | 'partyChoice';
}

export function InstantiationContainer({
  children,
  type,
}: IInstantiateContainerProps) {
  changeBodyBackground(AltinnAppTheme.altinnPalette.primary.white);
  const classes = useStyles();

  const language = useAppSelector((state) => state.language.language);
  const profile = useAppSelector((state) => state.profile.profile);

  return (
    <Grid
      container={true}
      direction='column'
      className={`container ${classes.instantiatePage}`}
    >
      <Header
        language={language}
        profile={profile}
        type={type}
      />
      <main id='main-content'>{children}</main>
    </Grid>
  );
}
