import { createStyles, Grid, withStyles, WithStyles } from '@material-ui/core';
import * as React from 'react';
import { useSelector } from 'react-redux';
import { AltinnAppTheme } from 'altinn-shared/theme';
import { IProfile } from 'altinn-shared/types';
import Header from '../../../shared/components/altinnAppHeader';
import { IRuntimeState } from '../../../types';
import { changeBodyBackground } from '../../../utils/bodyStyling';

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
  children?: any;
  type: 'normal' | 'partyChoice';
}

function InstantiateContainer(props: IInstantiateContainerProps) {
  changeBodyBackground(AltinnAppTheme.altinnPalette.primary.white);
  const { classes, children } = props;

  const language: any = useSelector((state: IRuntimeState) => state.language.language);
  const profile: IProfile = useSelector((state: IRuntimeState) => state.profile.profile);

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
      {children}
    </Grid>
  );
}

export default withStyles(styles)(InstantiateContainer);
