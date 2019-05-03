import { Grid, Paper, Typography } from '@material-ui/core';
import { createMuiTheme, createStyles, withStyles } from '@material-ui/core/styles';
import { TypographyProps } from '@material-ui/core/Typography';
import classNames from 'classnames';
import * as React from 'react';
import AltinnButton from '../../../../../shared/src/components/AltinnButton';
import AltinnIcon from '../../../../../shared/src/components/AltinnIcon';
import AltinnSpinner from '../../../../../shared/src/components/AltinnSpinner';
import altinnTheme from '../../../../../shared/src/theme/altinnStudioTheme';
import { getLanguageFromKey } from '../../../../../shared/src/utils/language';
import VersionControlContainer from '../../../../../shared/src/version-control/versionControlHeader';
import { urls } from '../../../config/sharedConfig';
import { inSyncStatus } from '../containers/deployToTestContainer';

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
  cSharpCompileStatusSuccess: boolean;
  cSharpCompileStatusUniqueFilenames: [];
  deploymentListFetchStatus: any;
  deployStatus: any;
  deploySuccess?: boolean;
  env: string;
  language: any;
  localRepoInSyncWithMaster: inSyncStatus.ahead | inSyncStatus.behind | inSyncStatus.ready;
  masterRepoAndDeployInSync: boolean;
  onClickStartDeployment: any;
  titleTypographyVariant: TypographyProps['variant'];
}

export const DeployPaper = (props: IDeployPaperProps) => {
  const { classes, localRepoInSyncWithMaster } = props;

  const renderRepoInSync = () => {
    return (
      <React.Fragment>
        <Grid item={true} xs={1} id='renderInSync'>
          <div
            className={classNames({
              [classes.checkIconPositionFix]: localRepoInSyncWithMaster === inSyncStatus.ready,
            })}
          >
            <AltinnIcon
              iconClass={classNames({
                ['ai ai-check']: localRepoInSyncWithMaster === inSyncStatus.ready,
                ['fa fa-info-circle']: localRepoInSyncWithMaster !== inSyncStatus.ready,
              })}
              iconColor={localRepoInSyncWithMaster === inSyncStatus.ready ?
                theme.altinnPalette.primary.green : '#008FD6'}
              padding='0px 0px 7px 0px'
            />
          </div>

        </Grid>
        <Grid item={true} xs={11}>
          {renderInSyncText(localRepoInSyncWithMaster)}
        </Grid>
      </React.Fragment>
    );
  };

  const renderInSyncText = (inSyncStatusParam: string) => {
    switch (inSyncStatusParam) {

      case inSyncStatus.ready:
        return (
          <Typography variant='h2' className={classes.listItemTitle}>
            {getLanguageFromKey('deploy_to_test.shared_with_org_true', props.language)}
          </Typography>
        );

      case inSyncStatus.ahead:
        return (
          <React.Fragment>
            <Typography variant='h2' className={classes.listItemTitle}>
              {getLanguageFromKey('deploy_to_test.shared_with_org_false', props.language)}
            </Typography>
            <Typography variant='body1'>
              {getLanguageFromKey('deploy_to_test.shared_with_org_false_changes_will_not_be_visible_in_test_env',
                props.language)}
            </Typography>
            <div style={{ marginTop: 20, marginBottom: 20 }}>
              <VersionControlContainer
                language={props.language}
                type='shareButton'
              />
            </div>
          </React.Fragment>
        );

      case inSyncStatus.behind:
        return (
          <React.Fragment>
            <Typography variant='h2' className={classes.listItemTitle}>
              {getLanguageFromKey('deploy_to_test.changes_made_by_others_in_your_organisation_title', props.language)}
            </Typography>
            <Typography variant='body1'>
              {/* tslint:disable-next-line:max-line-length */}
              {getLanguageFromKey('deploy_to_test.changes_made_by_others_in_your_organisation_is_not_visible_in_altinn_studio', props.language)}
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

  const renderCSharpCompilesText = (cSharpCompileSuccess: boolean) => {
    const { org, service } = window as IAltinnWindow;

    switch (cSharpCompileSuccess) {

      case true:
        return (
          <Typography variant='h2' className={classes.listItemTitle}>
            {getLanguageFromKey('deploy_to_test.check_csharp_compiles_true_title', props.language)}
          </Typography>
        );

      case false:
        return (
          <React.Fragment>
            <Typography variant='h2' className={classes.listItemTitle}>
              {getLanguageFromKey('deploy_to_test.check_csharp_compiles_false_title', props.language)}
            </Typography>
            <div style={{ margin: '6px 0px 12px 10px' }}>
              {props.cSharpCompileStatusUniqueFilenames.map((file) => (
                <Typography variant='body1' key={file}>
                  {file}
                </Typography>
              ))}
            </div>
            <Typography variant='body1'>
              {getLanguageFromKey('deploy_to_test.check_csharp_compiles_false_body_part1', props.language)}&nbsp;
              <a href={`/${org}/${service}`} className={classes.link} target='_blank'>
                {/* TODO: Remember to change text when file edit page is available */}
                {getLanguageFromKey('deploy_to_test.check_csharp_compiles_false_body_part2', props.language)}<AltinnIcon
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

  const renderDeploySuccess = (env: string, host: string) => {
    const { org, service } = window as IAltinnWindow;

    const url = `http://${org}.apps.${env}.${host}/${service}`;
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
              {getLanguageFromKey('deploy_to_test.service_is_ready_for_test', props.language)}
            </Typography>
            <Typography
              variant='body1'
            >
              {getLanguageFromKey('deploy_to_test.general_service_is_deployed_from_org', props.language)}
            </Typography>
          </Grid>
        </Grid>
        <div style={{ marginTop: 24 }}>
          <a href={url} className={classes.link} target='_blank'>
            {getLanguageFromKey('deploy_to_test.service_is_ready_for_test_open_service_in_new_window', props.language)}
          </a>
        </div>
      </React.Fragment>
    );
  };

  const renderError = (env: string, error: string) => {
    return (
      <React.Fragment>
        <Typography
          variant={props.titleTypographyVariant}
          className={classes.fontSizeTitle}
        >
          {getLanguageFromKey('deploy_to_test.error_a_problem_has_occured', props.language)}
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
              {`${getLanguageFromKey('deploy_to_test.error_there_is_something_wrong_with_your_environment_part1',
                props.language)}
                ${env}${getLanguageFromKey('deploy_to_test.error_there_is_something_wrong_with_your_environment_part2',
                  props.language)}`}
            </Typography>
            <Typography variant='body1'>
              {getLanguageFromKey('deploy_to_test.error_message_with_colon', props.language)} {error}
            </Typography>
          </Grid>
        </Grid>
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
    if (props.deploySuccess !== true &&
      props.cSharpCompileStatusSuccess === true &&
      props.masterRepoAndDeployInSync === false) {
      return true;
    } else {
      return false;
    }
  };

  const renderDeployFailedErrorMsg = (buildId: string) => {
    const url = `https://dev.azure.com/brreg/altinn-studio/_build/results?buildId=${buildId}`;
    return (
      <React.Fragment>
        <Typography
          variant={props.titleTypographyVariant}
          className={classes.fontSizeTitle}
        >
          {getLanguageFromKey('deploy_to_test.error_service_was_not_deployed_title', props.language)}
        </Typography>
        <Typography
          variant='body1'
          className={classes.bodyTextStyling}
        >
          {getLanguageFromKey('deploy_to_test.general_service_will_be_deployed_from_org', props.language)}
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
              {getLanguageFromKey('deploy_to_test.error_service_was_not_deployed_check_title', props.language)}
            </Typography>
            <Typography variant='body1'>
              <a href={url} className={classes.link} target='_blank'>
                {getLanguageFromKey('deploy_to_test.general_click_to_see_error_log', props.language)}
              </a>
            </Typography>
          </Grid>
        </Grid>
      </React.Fragment>
    );
  };

  const onClickStartDeployment = () => {
    props.onClickStartDeployment(props.env);
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

        {props.deploySuccess === true ? renderDeploySuccess(props.env, urls.hostname.apps.test) :
          props.deploySuccess === false ? renderDeployFailedErrorMsg(props.deployStatus.result.buildId) :
            props.deploymentListFetchStatus.success === false ? renderError(props.env,
              props.deploymentListFetchStatus.error) : (
                // Render the normal paper
                <React.Fragment>
                  {props.masterRepoAndDeployInSync === true ?
                    (
                      // Commit from master is already deployed
                      renderPaperTitle(getLanguageFromKey('deploy_to_test.master_and_deploy_in_sync_title',
                        props.language), getLanguageFromKey('deploy_to_test.general_service_is_deployed_from_org',
                          props.language))
                    ) :
                    props.cSharpCompileStatusSuccess === true ?
                      (
                        // Ready for deploy (if cSharpCompileStatusSuccess)
                        renderPaperTitle(getLanguageFromKey('deploy_to_test.service_is_ready_to_deploy_title_true',
                          props.language),
                          getLanguageFromKey('deploy_to_test.general_service_will_be_deployed_from_org',
                            props.language))
                      ) : (
                        // NOT ready for deploy
                        renderPaperTitle(getLanguageFromKey('deploy_to_test.service_is_ready_to_deploy_title_false',
                          props.language),
                          getLanguageFromKey('deploy_to_test.general_service_will_be_deployed_from_org',
                            props.language))
                      )
                  }

                  <Grid container={true} style={{ marginTop: 24 }} spacing={16} alignItems='flex-start'>

                    {/* Render the repo in sync part */}
                    {renderRepoInSync()}

                    {/* If master repo and deploy is not in sync, render the C# compiles part */}
                    {props.masterRepoAndDeployInSync !== true &&
                      <React.Fragment>
                        <Grid item={true} xs={1} id='rendercSharpCompiles'>
                          <div
                            className={classNames({ [classes.checkIconPositionFix]: props.cSharpCompileStatusSuccess })}
                          >
                            <AltinnIcon
                              iconClass={classNames({
                                ['ai ai-check']: props.cSharpCompileStatusSuccess,
                                ['fa fa-circle-exclamation']: !props.cSharpCompileStatusSuccess,
                              })}
                              iconColor={props.cSharpCompileStatusSuccess ?
                                theme.altinnPalette.primary.green : theme.altinnPalette.primary.red}
                              padding='0px 0px 7px 0px'
                            />
                          </div>
                        </Grid>
                        <Grid item={true} xs={11}>
                          {renderCSharpCompilesText(props.cSharpCompileStatusSuccess)}
                        </Grid>
                      </React.Fragment>
                    }

                  </Grid>
                </React.Fragment>
              )}

        {/* Render the deploy button and help text */}
        {props.deploySuccess !== true && props.deploymentListFetchStatus.success !== false &&
          <div style={{ marginTop: 20 }}>

            {props.deployStatus.deployStartedSuccess === true && !props.deployStatus.result.finishTime ? (
              <Grid container={true} alignItems='center'>
                <Grid item={true} style={{ marginRight: 10 }}>
                  <AltinnSpinner
                    id='DeploySpinner'
                  />
                </Grid>
                <Grid item={true}>
                  <Typography variant='body1'>
                    {getLanguageFromKey('deploy_to_test.deploy_in_progress', props.language)}
                  </Typography>
                </Grid>
              </Grid>
            ) : (
                <Grid container={true} alignItems='center'>
                  <Grid item={true} xs={12} lg={5} style={{ marginBottom: 10 }}>
                    <AltinnButton
                      id='deployButton'
                      btnText={getLanguageFromKey('deploy_to_test.deploy_button_text_deploy_to_test_env',
                        props.language)}
                      disabled={!returnReadyForDeployStatus()}
                      onClickFunction={onClickStartDeployment}
                    />
                  </Grid>
                  <Grid item={true} xs={12} lg={7}>
                    {returnReadyForDeployStatus() &&
                      <Typography variant='body1' className={classes.deployButtonInfoText}>
                        {getLanguageFromKey('deploy_to_test.deploy_helper_text_service_will_be_replaced',
                          props.language)}
                      </Typography>
                    }
                  </Grid>
                </Grid>

              )}

          </div>
        }

      </Paper>
    </React.Fragment >
  );
};

export default withStyles(styles)(DeployPaper);
