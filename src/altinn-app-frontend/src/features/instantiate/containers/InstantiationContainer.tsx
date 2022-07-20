import * as React from 'react';

import { createStyles, Grid, withStyles } from '@material-ui/core';
import type { WithStyles } from '@material-ui/core';

import { useAppSelector } from 'src/common/hooks';
import Header from 'src/shared/components/altinnAppHeader';
import { changeBodyBackground } from 'src/utils/bodyStyling';

import { AltinnAppTheme } from 'altinn-shared/theme';

const styles = createStyles({
  instantiatePage: {
    width: '100%',
    maxWidth: '1056px',
    backgroundColor: AltinnAppTheme.altinnPalette.primary.white,
    display: 'flex',
    flexDirection: 'column',
    alignSelf: 'center',
    padding: 12,
    'ms-flex-wrap': 'nowrap',
  },
});

export interface IInstantiateContainerProps extends WithStyles<typeof styles> {
  children?: React.ReactNode;
  type: 'normal' | 'partyChoice';
}

function InstantiateContainer(props: IInstantiateContainerProps) {
  changeBodyBackground(AltinnAppTheme.altinnPalette.primary.white);
  const { classes, children } = props;

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
        type={props.type}
      />
      <main id='main-content'>{children}</main>
    </Grid>
  );
}

export default withStyles(styles)(InstantiateContainer);
