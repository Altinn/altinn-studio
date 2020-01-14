import {
  createStyles,
  Grid,
  Typography,
  withStyles,
  WithStyles,
} from '@material-ui/core';
import * as React from 'react';
import { useSelector } from 'react-redux';
import AltinnButton from 'app-shared/components/AltinnButton';
import AltinnInput from 'app-shared/components/AltinnInput';
import AltinnTextArea from 'app-shared/components/AltinnTextArea';
import AltinnPopover from 'app-shared/components/molecules/AltinnPopoverSimple';
import theme from 'app-shared/theme/altinnAppTheme';
import { getLanguageFromKey } from 'app-shared/utils/language';
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
    padding: '1.2rem 0rem 1.2rem 0rem',
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
    paddingTop: '0.5rem',
  },
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
    if (versionNameValid() && tagName !== '') {
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
            direction={'column-reverse'}
            justify={'flex-end'}
          >
            {!versionNameValid() ?
              <Grid
                className={classes.createReleaseInvalidTagNameWrapper}
                item={true}
              >
                <Typography
                  className={classes.createReleaseInvalidTagNameText}
                >
                  {getLanguageFromKey('app_create_release.release_versionnumber_validation', language)}
                </Typography>
              </Grid>
              : null
            }
            <AltinnInput
              label={getLanguageFromKey('app_create_release.release_versionnumber', language)}
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
            label={getLanguageFromKey('app_create_release.release_description', language)}
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
              onClickFunction={handleBuildVersionClick}
              btnText={getLanguageFromKey('app_create_release.build_version', language)}
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
                <>
                  {getLanguageFromKey('app_create_release_errors.build_cannot_start', language)}
                  &nbsp;
                  <a href={'mailto:tjenesteeier@altinn.no'} target='_blank'>
                    {getLanguageFromKey('app_create_release_errors.altinn_servicedesk', language)}
                  </a>
                </>
              }
            </Typography>
            <Typography
              className={classes.popoverTechnicalErrorText}
            >
              {getLanguageFromKey('app_create_release_errors.technical_error_code', language)}
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
