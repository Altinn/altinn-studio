import { createStyles, withStyles, WithStyles } from '@material-ui/core';
import Grid from '@material-ui/core/Grid';
import * as React from 'react';
import { useSelector } from 'react-redux';
import { RouteProps } from 'react-router-dom';
import AltinnAppTheme from 'Shared/theme/altinnAppTheme';
import { IAltinnWindow, IRuntimeState } from 'src/types';
import { changeBodyBackground } from '../../utils/bodyStyling';
import AltinnAppHeader from '../components/altinnAppHeader';
import AltinnError from '../components/altinnError';

const styles = createStyles({
  statefulErrorPage: {
    backgroundColor: AltinnAppTheme.altinnPalette.primary.white,
    width: '100%',
    height: '100%',
    maxWidth: '780px',
    display: 'flex',
    flexDirection: 'column',
    alignSelf: 'center',
    padding: 12,
  },
  statefulErrorContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'space-between',
  },
});

export interface IStateFullAltinnError extends RouteProps, WithStyles<typeof styles> {
}

export interface IRedirectErrorState {
  message: string;
}

function StatefulAltinnError(props: IStateFullAltinnError) {
  const { classes } = props;

  const language = useSelector((state: IRuntimeState) => state.language.language);
  const profile = useSelector((state: IRuntimeState) => state.profile.profile);

  changeBodyBackground(AltinnAppTheme.altinnPalette.primary.white);

  if (!props.location || !props.location.state || !props.location.state.message) {
    return (
      <>
        <AltinnAppHeader
          language={language}
          profile={profile}
          type={'normal'}
        />
        <Grid container={true} className={classes.statefulErrorPage}>
          <Grid item={true}>
            <AltinnError
              title={'Oh noes!'}
              content={'An error happened, out of no where!!'}
              statusCode={'500'}
              url={(window as IAltinnWindow).service}
              urlText={'Get help here!'}
              urlTextSuffix={'Altinn'}
            />
          </Grid>
        </Grid>
      </>
    );
  } else {
    const message = (props.location.state as IRedirectErrorState).message;
    return (
      <>
        <AltinnAppHeader
          language={language}
          profile={profile}
          type={'normal'}
        />
        <Grid container={true} className={classes.statefulErrorPage}>
          <Grid item={true}>
            <AltinnError
              title={'Oh noes!'}
              content={message}
              statusCode={'500'}
              url={'altinn.no'}
              urlText={'Get help here!'}
              urlTextSuffix={'Altinn'}
            />
          </Grid>
        </Grid>
      </>
    );
  }
}

export default withStyles(styles)(StatefulAltinnError);
