import { createStyles, withStyles, WithStyles } from '@material-ui/core';
import Grid from '@material-ui/core/Grid';
import * as React from 'react';
import { useSelector } from 'react-redux';
import { RouteProps } from 'react-router';
import { IRuntimeState } from 'src/types';
import AltinnAppTheme from '../../../../../shared/src/theme/altinnAppTheme';
import AltinnAppHeader from '../../../shared/components/altinnAppHeader';
import AltinnError from '../../../shared/components/altinnError';
import { changeBodyBackground } from '../../../utils/bodyStyling';

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

export interface IInstantiationErrorPageProps extends RouteProps, WithStyles<typeof styles> {
  title: string;
  content: React.ReactNode;
  statusCode: string;
}

function InstantiationErrorPage(props: IInstantiationErrorPageProps) {
  const language = useSelector((state: IRuntimeState) => state.language.language);
  const profile = useSelector((state: IRuntimeState) => state.profile.profile);

  changeBodyBackground(AltinnAppTheme.altinnPalette.primary.white);

  const {
    classes,
    content,
    statusCode,
    title,
  } = props;

  return (
    <div className={'container'}>
      <AltinnAppHeader
        language={language}
        profile={profile}
        type={'normal'}
      />
      <main role='main'>
        <Grid container={true} className={classes.statefulErrorPage}>
          <Grid item={true}>
            <AltinnError
              title={title}
              content={content}
              statusCode={statusCode}
              titleFontWeight={'medium'}
            />
          </Grid>
        </Grid>
      </main>
    </div>
  );
}

export default withStyles(styles)(InstantiationErrorPage);
