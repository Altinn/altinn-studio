import {
  createStyles,
  Grid,
  withStyles,
  WithStyles,
  Typography,
} from '@material-ui/core';
import * as React from 'react';
import { useSelector } from 'react-redux';
import AltinnButton from '../../../../../shared/src/components/AltinnButton';
import AltinnInput from '../../../../../shared/src/components/AltinnInput';
import AltinnTextArea from '../../../../../shared/src/components/AltinnTextArea';
import theme from '../../../../../shared/src/theme/altinnAppTheme';
import AppReleaseActions from '../../../sharedResources/appRelease/appReleaseDispatcher';
import { BuildResult, BuildStatus, IRelease } from '../../../sharedResources/appRelease/types';
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
  }
});

export interface ICreateAppReleaseComponent extends WithStyles<typeof styles> {
}

function ReleaseComponent(props: ICreateAppReleaseComponent) {
  const [tagName, setTagName] = React.useState<string>('');
  const [body, setBody] = React.useState<string>('');

  const releases: IRelease[] = useSelector((state: IServiceDevelopmentState) => state.appReleases.releases);
  const repoStatus: IRepoStatusState = useSelector((state: IServiceDevelopmentState) => state.repoStatus);

  function versionNameValid(): boolean {
    for(const release of releases) {
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

  function handleBuildVersionClick() {
    if (versionNameValid()) {
      AppReleaseActions.createAppRelease(tagName, tagName, body, repoStatus.branch.master.commit.id);
      setTagName('');
      setBody('');
    }
  }

  const { classes } = props;
  return (
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
                  Oh noes
                </Typography>
              </Grid>
              : null
            }
            <AltinnInput
              label={'Versjonnummer'}
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
          label={'Beskrivelse av innhold'}
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
        <AltinnButton
          classes={{}}
          onClickFunction={handleBuildVersionClick}
          btnText={'Bygg versjon'}
        />
      </Grid>
    </Grid>
  );
}

export default withStyles(styles)(ReleaseComponent);
