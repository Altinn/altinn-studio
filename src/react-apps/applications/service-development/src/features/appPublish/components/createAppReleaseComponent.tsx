import {
  createStyles,
  Grid,
  Typography,
  withStyles,
  WithStyles,
} from '@material-ui/core';
import * as React from 'react';
import { useSelector } from 'react-redux';
import AltinnButton from '../../../../../shared/src/components/AltinnButton';
import AltinnInput from '../../../../../shared/src/components/AltinnInput';
import AltinnTextArea from '../../../../../shared/src/components/AltinnTextArea';
import AltinnPopover from '../../../../../shared/src/components/molecules/AltinnPopoverSimple';
import theme from '../../../../../shared/src/theme/altinnAppTheme';
import AppReleaseActions from '../../../sharedResources/appRelease/appReleaseDispatcher';
import { IAppReleaseState } from '../../../sharedResources/appRelease/appReleaseReducer';
import { BuildResult, BuildStatus } from '../../../sharedResources/appRelease/types';
import { IRepoStatusState } from '../../../sharedResources/repoStatus/repoStatusReducer';

const styles = createStyles({
  createReleaseFormItem: {
    padding: '1.2rem',
  },
  createReleaseInvalidTagNameText: {
    backgroundColor: theme.altinnPalette.primary.yellowLight,
    padding: '1.2rem',
  },
  createReleaseInvalidTagNameWrapper: {
    padding: '2rem 2rem 0rem 2rem',
  },
  createReleaseErrorPopoverRoot: {
    backgroundColor: theme.altinnPalette.primary.redLight,
  },
  popoverErrorIcon: {
    color: theme.altinnPalette.primary.red,
    paddingTop: '0.8rem',
  },
  popoverErrorText: {
    paddingTop: '0.5rem',
  },
  popoverTechnicalErrorText: {
    fontSize: '1.4rem',
    paddingTop: '0.5rem'
  }
});

export interface ICreateAppReleaseComponent extends WithStyles<typeof styles> {
}

function ReleaseComponent(props: ICreateAppReleaseComponent) {
  const { classes } = props;

  const [tagName, setTagName] = React.useState<string>('');
  const [body, setBody] = React.useState<string>('');

  const releaseState: IAppReleaseState = useSelector((state: IServiceDevelopmentState) => state.appReleases);
  const createReleaseErrorCode: number =
    useSelector((state: IServiceDevelopmentState) => state.appReleases.errors.createReleaseErrorCode);
  const repoStatus: IRepoStatusState = useSelector((state: IServiceDevelopmentState) => state.repoStatus);
  const language: any = useSelector((state: IServiceDevelopmentState) => state.language);

  const [openErrorPopover, setOpenErrorPopover] = React.useState<boolean>(createReleaseErrorCode !== null);
  const ref = React.useRef<React.RefObject<HTMLButtonElement>>();

  React.useEffect(() => {
    if (createReleaseErrorCode !== null) {
      setOpenErrorPopover(true);
    }
  }, [createReleaseErrorCode]);

  function versionNameValid(): boolean {
    for (const release of releaseState.releases) {
      if (release.tagName.toLowerCase() === tagName.trim() &&
        (release.build.result === BuildResult.succeeded || release.build.status === BuildStatus.inProgress)
      ) {
        return false;
      }
    }
    if (tagName[0] === '.' || tagName[0] === '-') {
      return false;
    }
    if (!tagName.match(new RegExp('^[a-z0-9.-]*$'))) {
      return false;
    }
    if (tagName.length > 128) {
      return false;
    }
    return true;
  }

  function handleTagNameChange(event: React.ChangeEvent<HTMLInputElement>) {
    setTagName(event.currentTarget.value.toLowerCase());
  }

  function handleBodyChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setBody(event.currentTarget.value);
  }

  function handleBuildVersionClick(event: React.MouseEvent) {
    if (versionNameValid() && tagName !== '' && body !== '') {
      AppReleaseActions.createAppRelease(tagName, tagName, body, repoStatus.branch.master.commit.id);
      setTagName('');
      setBody('');
    }
    handlePopoverClose();
  }

  function handlePopoverClose() {
    setOpenErrorPopover(false);
  }

  if (releaseState.creatingRelease) {
    return null;
  }

  return (
    <>
      <Grid
        container={true}
        direction={'column'}
      >
        <Grid
          container={true}
          direction={'column'}
          className={classes.createReleaseFormItem}
        >
          <Grid
            container={true}
            direction={'row-reverse'}
            justify={'flex-end'}
          >
            {!versionNameValid() ?
              <Grid
                className={classes.createReleaseInvalidTagNameWrapper}
              >
                <Typography
                  className={classes.createReleaseInvalidTagNameText}
                >
                  {
                    !!language &&
                      !!language.app_create_release &&
                      !!language.app_create_release.release_versionnumber_validation ?
                      language.app_create_release.release_versionnumber_validation :
                      'language.app_create_release.release_versionnumber_validation'
                  }
                </Typography>
              </Grid>
              : null
            }
            <AltinnInput
              label={
                !!language &&
                  !!language.app_create_release &&
                  !!language.app_create_release.release_versionnumber ?
                  language.app_create_release.release_versionnumber :
                  'language.app_create_release.release_versionnumber'
              }
              onChange={handleTagNameChange}
              value={tagName}
              widthPercentage={50}
              validationError={!versionNameValid()}
            />
          </Grid>
        </Grid>
        <Grid
          container={true}
          direction={'column'}
          className={classes.createReleaseFormItem}
        >
          <AltinnTextArea
            label={
              !!language &&
                !!language.app_create_release &&
                !!language.app_create_release.release_description ?
                language.app_create_release.release_description :
                'language.app_create_release.release_description'
            }
            value={body}
            onChange={handleBodyChange}
            rows={4}
          />
        </Grid>
        <Grid
          container={true}
          direction={'column'}
          className={classes.createReleaseFormItem}
        >
          <div>
            <AltinnButton
              btnRef={ref}
              classes={{}}
              onClickFunction={handleBuildVersionClick}
              btnText={
                !!language &&
                  !!language.app_create_release &&
                  !!language.app_create_release.build_version ?
                  language.app_create_release.build_version :
                  'language.app_create_release.build_version'
              }
            />
          </div>
        </Grid>
      </Grid>
      <AltinnPopover
        anchorEl={createReleaseErrorCode !== null && openErrorPopover ? ref.current : null}
        handleClose={handlePopoverClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        paperProps={{
          classes: {
            root: classes.createReleaseErrorPopoverRoot,
          },
        }}
      >
        <Grid
          container={true}
          direction={'row'}
          spacing={3}
        >
          <Grid
            item={true}
            xs={1}
            style={{
              padding: 0,
            }}
          >
            <i className={`${classes.popoverErrorIcon} ai ai-circle-exclamation`}/>
          </Grid>
          <Grid
            item={true}
            xs={11}
            style={{
              padding: 0,
            }}
          >
            <Typography
              className={classes.popoverErrorText}
            >
              {
                !!language &&
                !!language.app_create_release_errors &&
                !!language.app_create_release_errors.build_cannot_start ?
                <>
                  {language.app_create_release_errors.build_cannot_start}
                  &nbsp;
                  <a href={''} target='_blank'>
                    {language.app_create_release_errors.altinn_servicedesk}
                  </a>
                </> :
                `language.app_create_release_errors.build_cannot_start language.app_create_release_errors.altinn_servicedesk`
              }
            </Typography>
            <Typography
              className={classes.popoverTechnicalErrorText}
            >
              {
                !!language &&
                !!language.app_create_release_errors &&
                !!language.app_create_release_errors.technical_error_code ?
                  language.app_create_release_errors.technical_error_code :
                  'language.app_create_release_errors.technical_error_code'
              }
              &nbsp;
              {createReleaseErrorCode}
            </Typography>
          </Grid>
        </Grid>
      </AltinnPopover>
    </>
  );
}

export default withStyles(styles)(ReleaseComponent);
