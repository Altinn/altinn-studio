import { Paper, Typography } from '@material-ui/core';
import { createMuiTheme, createStyles, withStyles } from '@material-ui/core/styles';
import { TypographyProps } from '@material-ui/core/Typography';
import classNames from 'classnames';
import * as React from 'react';
import altinnTheme from '../../../../../shared/src/theme/altinnStudioTheme';
import { getLanguageFromKey } from '../../../../../shared/src/utils/language';
import { urls } from '../../../config/sharedConfig';

const theme = createMuiTheme(altinnTheme);

const styles = () => createStyles({
  paperStyling: {
    backgroundColor: theme.altinnPalette.primary.greyLight,
    padding: 24,
    maxWidth: 800,
  },
  title: {
    fontSize: 20,
    marginBottom: 20,
  },
  link: {
    borderBottom: '1px solid #0062ba',
  },
  paperStyleRepoInSync: {
    backgroundColor: theme.altinnPalette.primary.white,
  },

});

interface ICurrentVersionPaperProps {
  classes: any;
  env: string;
  imageVersion: string;
  language: any;
  masterRepoAndDeployInSync: boolean;
  titleTypographyVariant: TypographyProps['variant'];
}

export const CurrentVersionPaper = (props: ICurrentVersionPaperProps) => {
  const { classes } = props;
  const { org, service } = window as IAltinnWindow;

  return (
    <React.Fragment>
      <Paper
        square={true}
        elevation={0}
        classes={{
          root: classNames(
            classes.paperStyling,
            {
              [classes.paperStyleRepoInSync]: props.masterRepoAndDeployInSync === true,
            }),
        }}
      >
        <Typography
          variant={props.titleTypographyVariant}
          className={classes.title}
        >
          {getLanguageFromKey('deploy_to_test.current_version_title', props.language)}
        </Typography>

        {props.imageVersion ? (
          <div>
            <Typography variant='body1'>
              <span style={{ fontWeight: 500 }}>
                {getLanguageFromKey('deploy_to_test.available_version', props.language)}
              </span>&nbsp;{props.imageVersion ? props.imageVersion.substring(0, 5) : null}...
            </Typography>
            <Typography variant='body1' style={{ marginTop: 5 }}>
              <span style={{ fontWeight: 500 }}>
                {getLanguageFromKey('deploy_to_test.service_url', props.language)}
              </span><br />
              <a
                href={`https://${org}.apps.${props.env}.${urls.hostname.apps.test}/${org}/${service}`}
                target='_blank'
                className={classes.link}
              >
                {`${org}.apps.${props.env}.${urls.hostname.apps.test}/${service}`}
              </a>
            </Typography>
          </div>
        ) : (
            <Typography variant='body1'>
              {getLanguageFromKey('deploy_to_test.service_not_available_in_test_env', props.language)}
            </Typography>
          )}

        <div style={{ marginTop: 20 }}>
          <Typography variant='body1'>
            {getLanguageFromKey('deploy_to_test.altinn_test_env_url', props.language)}<br />
            <a
              href={`https://${props.env}.${urls.hostname.altinn.test}`}
              target='_blank'
              className={classes.link}
            >
              {`${props.env}.${urls.hostname.altinn.test}`}
            </a>
          </Typography>
        </div>

      </Paper>
    </React.Fragment >
  );
};

export default withStyles(styles)(CurrentVersionPaper);
