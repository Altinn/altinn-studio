import { createStyles, Grid, withStyles, WithStyles } from '@material-ui/core';
import * as React from 'react';
import { AltinnAppTheme } from 'altinn-shared/theme';
import Header from '../../../shared/components/altinnAppHeader';
import { changeBodyBackground } from '../../../utils/bodyStyling';
import { useAppSelector } from 'src/common/hooks';

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

  const language = useAppSelector(state => state.language.language);
  const profile = useAppSelector(state => state.profile.profile);

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
