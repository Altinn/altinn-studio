import React from 'react';

import { Grid, makeStyles } from '@material-ui/core';

import { useAppSelector } from 'src/common/hooks/useAppSelector';
import { Footer } from 'src/features/footer/Footer';
import { AltinnAppHeader } from 'src/shared/components/altinnAppHeader';
import { ReadyForPrint } from 'src/shared/components/ReadyForPrint';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import { changeBodyBackground } from 'src/utils/bodyStyling';

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

export function InstantiationContainer({ children, type }: IInstantiateContainerProps) {
  changeBodyBackground(AltinnAppTheme.altinnPalette.primary.white);
  const classes = useStyles();

  const language = useAppSelector((state) => state.language.language);
  const profile = useAppSelector((state) => state.profile.profile);

  if (!language) {
    return null;
  }

  return (
    <Grid
      container={true}
      direction='column'
      className={`container ${classes.instantiatePage}`}
    >
      <AltinnAppHeader
        language={language}
        profile={profile}
        type={type}
      />
      <main id='main-content'>{children}</main>
      <Footer />
      <ReadyForPrint />
    </Grid>
  );
}
