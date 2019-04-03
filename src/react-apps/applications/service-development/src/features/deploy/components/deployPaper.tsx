import { Paper, Typography } from '@material-ui/core';
import classNames from 'classnames';
import * as React from 'react';

import { Grid } from '@material-ui/core';
import AltinnIcon from '../../../../../shared/src/components/AltinnIcon';
// import AltinnSpinner from '../../../../../shared/src/components/AltinnSpinner';

import { createMuiTheme, createStyles, withStyles } from '@material-ui/core/styles';
import { TypographyProps } from '@material-ui/core/Typography';
import AltinnButton from '../../../../../shared/src/components/AltinnButton';
import altinnTheme from '../../../../../shared/src/theme/altinnStudioTheme';

const theme = createMuiTheme(altinnTheme);

const styles = () => createStyles({
  paperStyling: {
    padding: 24,
    maxWidth: 800,
  },
  fontSizeTitle: {
    fontSize: 20,
  },
  checkTitle: {
    fontSize: 16,
    fontWeight: 500,
  },
  bodyTextStyling: {
    marginLeft: 5,
    marginTop: 5,
  },
  inSyncStyling: {

  },
  deployButtonStyling: {
    margin: '36px 0px 36px 0px',
  },
  link: {
    borderBottom: '1px solid #0062ba',
  },
  cSharpFileList: {
    margin: '5px 0px 10px 10px',
  },
  listItemText: {
    padding: '0px',
  },
  deployButtonInfoText: {
    color: theme.altinnPalette.primary.grey,
  },
  listItemTitle: {
    fontSize: theme.overrides.MuiTypography.body1.fontSize,
    fontWeight: 500,
  },
  paperStyleRepoInSync: {
    backgroundColor: theme.altinnPalette.primary.greyLight,
  },
  paperStyleDeploySuccess: {
    backgroundColor: theme.altinnPalette.primary.greenLight,
  },
});

interface IDeployPaperProps {
  classes: any;
  cSharpCompiles: boolean;
  inSync: 'ahead' | 'behind' | 'ready';
  titleTypographyVariant: TypographyProps['variant'];
  readyForDeployStatus: 'repoInSync' | 'ready' | 'unavailable' | 'deploySuccess';
  deploySuccess?: boolean;
}

export const DeployPaper = (props: IDeployPaperProps) => {
  // const classes = useStyles();
  const { classes, inSync } = props;

  const constMockCompileFiles = ['firstFile.cs', 'secondFile.cs', 'thirdFile.cs'];

  const renderInSyncText = (param: string) => {
    switch (param) {
      case 'ready':
        return (
          <Typography variant='h2' className={classes.listItemTitle}>
            Du har delt dine endringer med din organisasjon
          </Typography>
        );
      case 'ahead':
        return (
          <React.Fragment>
            <Typography variant='h2' className={classes.listItemTitle}>
              Du har ikke delt dine endringer med din organisasjon
              </Typography>
            <Typography variant='body1'>
              Dine endringer vil dermed ikke bli synlige i testmiljøet.
              </Typography>
            <div style={{ marginTop: 20, marginBottom: 20 }}>
              <AltinnButton
                btnText='Del endringer'
                secondaryButton={true}
                disabled={true}
              />
            </div>
          </React.Fragment>
        );
      case 'behind':
        return (
          <React.Fragment>
            <Typography variant='h2' className={classes.listItemTitle}>
              En annen har gjort endringer på tjenesten din
            </Typography>
            <Typography variant='body1'>
              Disse er ikke synlige for deg i Altinn Studio men vil synes i testmiljøet
            </Typography>
            <div style={{ marginTop: 20, marginBottom: 20 }}>
              <AltinnButton
                btnText='Hent endringer'
                secondaryButton={true}
                disabled={true}
              />
            </div>
          </React.Fragment>
        );
      default:
        return null;
    }
  };

  const renderCSharpCompilesText = (param: boolean) => {
    switch (param) {

      case true:
        return (
          <Typography variant='h2' className={classes.listItemTitle}>
            Tjenestens C#-filer kompilerer
          </Typography>
        );

      case false:
        return (
          <React.Fragment>
            <Typography variant='h2' className={classes.listItemTitle}>
              Tjenesten din kompilerer ikke. Disse filene inneholder feil:
          </Typography>
            <div style={{ margin: '6px 0px 12px 10px' }}>
              {constMockCompileFiles.map((file) => (
                <Typography variant='body1' key={file}>
                  {file}
                </Typography>
              ))}
            </div>
            <Typography variant='body1'>
              Du kan redigere og dele disse på <a className={classes.link}>
                siden for tjenestefiler
              <AltinnIcon
                  isActive={true}
                  iconClass='ai ai-arrowrightup'
                  iconColor={theme.altinnPalette.primary.black}
                  iconSize={30}
                  padding='0px 0px 4px 0px'
                />
              </a>
            </Typography>
          </React.Fragment>
        );

      default:
        return null;
    }
  };

  const renderReadyForDeployStatusText = (param: IDeployPaperProps['readyForDeployStatus']) => {
    switch (param) {

      case 'ready':
        return (
          <React.Fragment>
            <Typography
              variant={props.titleTypographyVariant}
              className={classes.fontSizeTitle}
            >
              Tjensten er klar til å legges ut i testmiljø
            </Typography>
            <Typography
              variant='body1'
              className={classes.bodyTextStyling}
            >
              Tjenesten som plasseres ut hentes fra organisasjonen
            </Typography>
          </React.Fragment>
        );

      case 'unavailable':
        return (
          <React.Fragment>
            <Typography
              variant={props.titleTypographyVariant}
              className={classes.fontSizeTitle}
            >
              Tjenesten er IKKE klar til å legges ut i testmiljø
            </Typography>
            <Typography
              variant='body1'
              className={classes.bodyTextStyling}
            >
              Tjenesten som plasseres ut hentes fra din organisasjon
            </Typography>
          </React.Fragment>
        );

      case 'repoInSync':
        return (
          <React.Fragment>
            <Typography
              variant={props.titleTypographyVariant}
              className={classes.fontSizeTitle}
            >
              Siste versjon av tjenesten ligger i testmiljø
            </Typography>
            <Typography
              variant='body1'
              className={classes.bodyTextStyling}
            >
              Tjenesten som er plassert ut er hentet fra din organisasjon
            </Typography>
          </React.Fragment>
        );

      case 'deploySuccess':
        return (
          <React.Fragment>
            <Grid container={true}>
              <Grid item={true} xs={1} style={{ paddingTop: 5 }}>
                <AltinnIcon
                  iconClass='fa fa-circlecheck'
                  iconColor={theme.altinnPalette.primary.black}
                />
              </Grid>
              <Grid item={true} xs={11}>
                <Typography
                  variant={props.titleTypographyVariant}
                  className={classes.fontSizeTitle}
                >
                  Tjenesten din er klar for test
                </Typography>
                <Typography
                  variant='body1'
                >
                  Tjenesten som er lagt ut er hentet fra din organisasjon
                </Typography>
              </Grid>
            </Grid>
            <div style={{ marginTop: 24 }}>
              <a className={classes.link}>
                Åpne tjenesten i et nytt vindu
              <AltinnIcon
                  isActive={true}
                  iconClass='ai ai-arrowrightup'
                  iconColor={theme.altinnPalette.primary.black}
                  iconSize={30}
                  padding='0px 0px 4px 0px'
                />
              </a>
            </div>
          </React.Fragment>
        );

      default:
        return null;
    }
  };

  return (
    <React.Fragment>
      <Paper
        square={true}
        elevation={1}
        classes={{
          root: classNames(
            classes.paperStyling,
            {
              [classes.paperStyleRepoInSync]: props.readyForDeployStatus === 'repoInSync',
              [classes.paperStyleDeploySuccess]: props.readyForDeployStatus === 'deploySuccess',
            }),
        }}
      >
        {renderReadyForDeployStatusText(props.readyForDeployStatus)}

        {props.readyForDeployStatus !== 'deploySuccess' &&
          <React.Fragment>

            <Grid container={true} style={{ marginTop: 24 }} spacing={16} alignItems='center'>
              <Grid item={true} xs={1}>
                <AltinnIcon
                  iconClass={classNames({
                    ['ai ai-check']: inSync === 'ready',
                    ['fa fa-circle-exclamation']: inSync !== 'ready',
                  })}
                  iconColor={inSync === 'ready' ? theme.altinnPalette.primary.green : '#008FD6'}
                />
              </Grid>
              <Grid item={true} xs={11}>
                {renderInSyncText(inSync)}
              </Grid>

              <Grid item={true} xs={1}>
                <AltinnIcon
                  iconClass={classNames({
                    ['ai ai-check']: props.cSharpCompiles,
                    ['fa fa-circle-exclamation']: !props.cSharpCompiles,
                  })}
                  iconColor={props.cSharpCompiles ? theme.altinnPalette.primary.green : theme.altinnPalette.primary.red}
                />
              </Grid>
              <Grid item={true} xs={11}>
                {renderCSharpCompilesText(props.cSharpCompiles)}
              </Grid>
            </Grid>

            <div style={{ marginTop: 20 }}>
              <Grid container={true} alignItems='center'>
                <Grid item={true} xs={12} lg={5} style={{ marginBottom: 10 }}>
                  <AltinnButton
                    btnText='Legg ut tjenesten i testmiljø'
                    disabled={props.readyForDeployStatus !== 'ready'}
                  />
                </Grid>
                <Grid item={true} xs={12} lg={7}>
                  {props.readyForDeployStatus === 'ready' &&
                    <Typography variant='body1' className={classes.deployButtonInfoText}>
                      Den tidligere versjonen vil bli overskrevet når du legger ut tjenesten på nytt
                </Typography>
                  }
                </Grid>
              </Grid>
            </div>

          </React.Fragment>
        }
      </Paper>
    </React.Fragment >
  );
};

export default withStyles(styles)(DeployPaper);
