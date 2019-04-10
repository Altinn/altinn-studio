/* tslint:disable:max-line-length */

import { Grid, Paper, Typography } from '@material-ui/core';
import { createMuiTheme, createStyles, withStyles } from '@material-ui/core/styles';
import { TypographyProps } from '@material-ui/core/Typography';
import classNames from 'classnames';
import * as React from 'react';
import AltinnButton from '../../../../../shared/src/components/AltinnButton';
import AltinnIcon from '../../../../../shared/src/components/AltinnIcon';
// import AltinnSpinner from '../../../../../shared/src/components/AltinnSpinner';
import altinnTheme from '../../../../../shared/src/theme/altinnStudioTheme';
import VersionControlContainer from '../../../../../shared/src/version-control/versionControlHeader';

const theme = createMuiTheme(altinnTheme);

const styles = () => createStyles({
  paperStyling: {
    padding: 24,
    maxWidth: 800,
  },
  checkIconPositionFix: {
    position: 'relative',
    top: '-5px',
  },
  bodyTextStyling: {
    marginLeft: 5,
    marginTop: 5,
  },
  deployButtonInfoText: {
    color: theme.altinnPalette.primary.grey,
  },
  fontSizeTitle: {
    fontSize: 20,
  },
  link: {
    borderBottom: '1px solid #0062ba',
  },
  listItemTitle: {
    fontSize: theme.overrides.MuiTypography.body1.fontSize,
    fontWeight: 500,
  },
  paperStyleDeployFailed: {
    backgroundColor: theme.altinnPalette.primary.redLight,
  },
  paperStyleDeploySuccess: {
    backgroundColor: theme.altinnPalette.primary.greenLight,
  },
  paperStyleRepoInSync: {
    backgroundColor: theme.altinnPalette.primary.greyLight,
  },
});

interface IDeployPaperProps {
  classes: any;
  cSharpCompiles: boolean;
  localRepoInSyncWithMaster: 'ahead' | 'behind' | 'ready';
  titleTypographyVariant: TypographyProps['variant'];
  masterRepoAndDeployInSync: boolean;
  deploySuccess?: boolean;
  deployFailedErrorMsg?: any;
  language: any;
}

export const DeployPaper = (props: IDeployPaperProps) => {
  const { classes, localRepoInSyncWithMaster } = props;

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
              <VersionControlContainer
                language={props.language}
                type='shareButton'
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
              <VersionControlContainer
                language={props.language}
                type='fetchButton'
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
              Du kan redigere og dele disse på <a className={classes.link}>siden for tjenestefiler<AltinnIcon
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

  const renderDeploySuccess = (deploySuccess: boolean) => {
    return (
      <React.Fragment>
        <Grid container={true}>
          <Grid item={true} xs={1} style={{ paddingTop: 5 }}>
            <AltinnIcon
              iconClass={'fa fa-circlecheck'}
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
  };

  const renderPaperTitle = (title: string, body: string) => {
    return (
      <React.Fragment>
        <Typography
          variant={props.titleTypographyVariant}
          className={classes.fontSizeTitle}
        >
          {title}
        </Typography>
        <Typography
          variant='body1'
          className={classes.bodyTextStyling}
        >
          {body}
        </Typography>
      </React.Fragment>
    );
  };

  const returnReadyForDeployStatus = () => {
    if (props.deploySuccess !== true && props.cSharpCompiles && !props.masterRepoAndDeployInSync) {
      return true;
    } else {
      return false;
    }
  };

  const renderDeployFailedErrorMsg = (error: string) => {
    return (
      <React.Fragment>
        <Typography
          variant={props.titleTypographyVariant}
          className={classes.fontSizeTitle}
        >
          Tjenesten ble ikke lagt ut i testmiljøet
        </Typography>
        <Typography
          variant='body1'
          className={classes.bodyTextStyling}
        >
          Tjenesten som plasseres ut hentes fra din organisasjon
        </Typography>

        <Grid container={true} style={{ marginTop: 24 }} spacing={16} alignItems='flex-start'>
          <Grid item={true} xs={1}>
            <AltinnIcon
              iconClass={'fa fa-circle-exclamation'}
              iconColor={theme.altinnPalette.primary.red}
            />
          </Grid>
          <Grid item={true} xs={11}>
            <Typography variant='h2' className={classes.listItemTitle}>
              Noe gikk galt og tjenesten ble ikke lagt ut i testmiljøet. Prøv å legge den ut på nytt.
          </Typography>
            <Typography variant='body1'>
              {error}
            </Typography>
          </Grid>
        </Grid>
      </React.Fragment>
    );
  };

  return (
    <React.Fragment>
      <Paper
        square={true}
        elevation={props.masterRepoAndDeployInSync === true ? 0 : 1}
        classes={{
          root: classNames(
            classes.paperStyling,
            {
              [classes.paperStyleRepoInSync]: props.masterRepoAndDeployInSync === true,
              [classes.paperStyleDeploySuccess]: props.deploySuccess === true,
              [classes.paperStyleDeployFailed]: props.deploySuccess === false,
            }),
        }}
      >

        {props.deploySuccess === true ? renderDeploySuccess(props.deploySuccess) :
          props.deploySuccess === false ? renderDeployFailedErrorMsg(props.deployFailedErrorMsg) : (
            <React.Fragment>
              {props.masterRepoAndDeployInSync === true ?
                (
                  // Commit from master is already deployed
                  renderPaperTitle('Siste versjon av tjenesten ligger i testmiljø', 'Tjenesten som er plassert ut er hentet fra din organisasjon')
                ) :
                props.cSharpCompiles === true ?
                  (
                    // Ready for deploy (if cSharpCompiles)
                    renderPaperTitle('Tjenesten er klar til å legges ut i testmiljø', 'Tjenesten som plasseres ut hentes fra organisasjonen')
                  ) : (
                    // NOT ready for deploy
                    renderPaperTitle('Tjenesten er IKKE klar til å legges ut i testmiljø', 'Tjenesten som plasseres ut hentes fra din organisasjon')
                  )
              }

              <Grid container={true} style={{ marginTop: 24 }} spacing={16} alignItems='flex-start'>

                {/* Render the repo in sync part */}
                <Grid item={true} xs={1} id='renderInSync'>
                  <div className={classNames({ [classes.checkIconPositionFix]: localRepoInSyncWithMaster === 'ready' })}>
                    <AltinnIcon
                      iconClass={classNames({
                        ['ai ai-check']: localRepoInSyncWithMaster === 'ready',
                        ['fa fa-circle-exclamation']: localRepoInSyncWithMaster !== 'ready',
                      })}
                      iconColor={localRepoInSyncWithMaster === 'ready' ? theme.altinnPalette.primary.green : '#008FD6'}
                      padding='0px 0px 7px 0px'
                    />
                  </div>

                </Grid>
                <Grid item={true} xs={11}>
                  {renderInSyncText(localRepoInSyncWithMaster)}
                </Grid>

                {/* If master repo and deploy is not in sync, render the C# compiles part */}
                {!props.masterRepoAndDeployInSync &&
                  <React.Fragment>
                    <Grid item={true} xs={1} id='rendercSharpCompiles'>
                      <div className={classNames({ [classes.checkIconPositionFix]: props.cSharpCompiles })}>
                        <AltinnIcon
                          iconClass={classNames({
                            ['ai ai-check']: props.cSharpCompiles,
                            ['fa fa-circle-exclamation']: !props.cSharpCompiles,
                          })}
                          iconColor={props.cSharpCompiles ?
                            theme.altinnPalette.primary.green : theme.altinnPalette.primary.red}
                          padding='0px 0px 7px 0px'
                        />
                      </div>
                    </Grid>
                    <Grid item={true} xs={11}>
                      {renderCSharpCompilesText(props.cSharpCompiles)}
                    </Grid>
                  </React.Fragment>
                }

              </Grid>
            </React.Fragment>
          )}
        {/* Render the button and help text */}
        {props.deploySuccess !== true &&
          <div style={{ marginTop: 20 }}>
            <Grid container={true} alignItems='center'>
              <Grid item={true} xs={12} lg={5} style={{ marginBottom: 10 }}>
                <AltinnButton
                  id='deployButton'
                  btnText='Legg ut tjenesten i testmiljø'
                  disabled={!returnReadyForDeployStatus()}
                />
              </Grid>
              <Grid item={true} xs={12} lg={7}>
                {returnReadyForDeployStatus() &&
                  <Typography variant='body1' className={classes.deployButtonInfoText}>
                    Den tidligere versjonen vil bli overskrevet når du legger ut tjenesten på nytt
                  </Typography>
                }
              </Grid>
            </Grid>
          </div>
        }

      </Paper>
    </React.Fragment >
  );
};

export default withStyles(styles)(DeployPaper);
