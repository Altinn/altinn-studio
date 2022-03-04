import { createTheme, Grid, makeStyles, Popover, Typography } from '@material-ui/core';
import * as React from 'react';
import AltinnButton from 'app-shared/components/AltinnButton';
import studioTheme from 'app-shared/theme/altinnStudioTheme';
import { getLanguageFromKey, getParsedLanguageFromKey } from 'app-shared/utils/language';

const theme = createTheme(studioTheme);

const setupClasses = makeStyles({
  sidebarHeader: {
    marginBottom: 20,
    fontSize: 20,
    fontWeight: 500,
  },
  sidebarHeaderSecond: {
    marginTop: 36,
  },
  sidebarInfoText: {
    fontSize: 16,
    marginBottom: 12,
  },
  modalContainer: {
    padding: 24,
    width: '471px',
  },
  itemSeparator: {
    paddingBottom: 12,
  },
  sectionSeparator: {
    paddingBottom: 32,
  },
  blackText: {
    color: 'black',
  },
  confirmButton: {
    backgroundColor: theme.altinnPalette.primary.red,
    color: theme.altinnPalette.primary.white,
    marginTop: 30,
  },
  cancelButton: {
    marginTop: 30,
  },
});

export interface IDownloadRepoModalProps {
  anchorRef: React.MutableRefObject<Element>;
  onClose: any;
  open: boolean;
  language: any;
}

function DownloadRepoModal(props: IDownloadRepoModalProps) {
  const classes = setupClasses();

  return (
    <div data-testid='download-repo-container'>
      <Popover
        open={props.open}
        anchorEl={props.anchorRef.current}
        onClose={props.onClose}
        anchorOrigin={{
          vertical: 'center',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'center',
          horizontal: 'center',
        }}
        data-testid='download-repo-popover'
      >
        <Grid
          container={true}
          direction='column'
          className={classes.modalContainer}
        >
          <Grid item={true} className={classes.itemSeparator}>
            <Typography className={classes.sidebarHeader}>
              {getLanguageFromKey('administration.download_repo_heading', props.language)}
            </Typography>
          </Grid>
          <Grid item={true} className={classes.sectionSeparator}>
            <Typography variant='body1'>
              {getParsedLanguageFromKey(
                'administration.download_repo_info',
                props.language,
              )}
            </Typography>
          </Grid>
          <Grid item={true} className={classes.itemSeparator}>
            <Typography variant='body1' className={classes.blackText}>
              <a href={`/designer/api/v1/repos/${(window as any).org}/${(window as any).app}/contents.zip`}>{getLanguageFromKey('administration.download_repo_changes', props.language)}</a>
            </Typography>
          </Grid>
          <Grid item={true}>
            <Typography variant='body1' className={classes.blackText}>
              <a href={`/designer/api/v1/repos/${(window as any).org}/${(window as any).app}/contents.zip?full=true`}>{getLanguageFromKey('administration.download_repo_full', props.language)}</a>
            </Typography>
          </Grid>
          <Grid container={true}>
            <Grid item={true} xs={6} />
            <Grid item={true} xs={6}>
              <AltinnButton
                onClickFunction={props.onClose}
                btnText={getLanguageFromKey('general.cancel', props.language)}
                secondaryButton={true}
                className={classes.cancelButton}
              />
            </Grid>
          </Grid>
        </Grid>
      </Popover>
    </div>
  );
}

export default DownloadRepoModal;
