import { createMuiTheme, Grid, makeStyles, Popover, Typography } from '@material-ui/core';
import * as React from 'react';
import AltinnButton from 'app-shared/components/AltinnButton';
import AltinnInputField from 'app-shared/components/AltinnInputField';
import studioTheme from 'app-shared/theme/altinnStudioTheme';
import { getLanguageFromKey } from 'app-shared/utils/language';

const theme = createMuiTheme(studioTheme);

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

export interface IResetRepoModalProps {
  anchorEl: any;
  onClose: any;
  open: boolean;
  language: any;
  repositoryName: string;
  handleClickResetRepo: () => void;
}

function ResetRepoModal(props: IResetRepoModalProps) {
  const classes = setupClasses();

  const [canDelete, setCanDelete] = React.useState<boolean>(false);
  const [deleteRepoName, setDeleteRepoName] = React.useState<string>('');

  React.useEffect(() => {
    if (deleteRepoName === props.repositoryName) {
      setCanDelete(true);
    } else {
      setCanDelete(false);
    }
  }, [deleteRepoName]);

  const onDeleteRepoNameChange = (event: any) => {
    setDeleteRepoName(event.target.value);
  };

  return (
    <Popover
      open={props.open}
      anchorEl={props.anchorEl}
      onClose={props.onClose}
      anchorOrigin={{
        vertical: 'center',
        horizontal: 'center',
      }}
      transformOrigin={{
        vertical: 'center',
        horizontal: 'center',
      }}
    >
      <Grid
        container={true}
        direction='column'
        className={classes.modalContainer}
      >
        <Grid item={true} className={classes.itemSeparator}>
          <Typography className={classes.sidebarHeader}>
            {getLanguageFromKey('Slette endringer?', props.language)}
          </Typography>
        </Grid>
        <Grid item={true} className={classes.sectionSeparator}>
          <Typography variant='body1'>
            {getLanguageFromKey('Du vil nå slette endringer gjort på <navn på repo>. Endringene kan ikke gjenopprettes.', props.language)}
          </Typography>
        </Grid>
        <Grid item={true}>
          <Typography variant='body1' className={classes.blackText}>
            {getLanguageFromKey('Skriv inn navn på repository', props.language)}
          </Typography>
        </Grid>
        <Grid item={true} className={classes.itemSeparator}>
          <AltinnInputField
            id='delete-repo-name-input'
            textFieldId='delete-repo-name'
            fullWidth={true}
            onChangeFunction={onDeleteRepoNameChange}
          />
        </Grid>
        <Grid container={true}>
          <Grid item={true} xs={6}>
            <AltinnButton
              onClickFunction={props.handleClickResetRepo}
              btnText={getLanguageFromKey('Slett mine endringer', props.language)}
              id='confirm-reset-repo-button'
              disabled={!canDelete}
              className={classes.confirmButton}
            />
          </Grid>
          <Grid item={true} xs={6}>
            <AltinnButton
              onClickFunction={props.onClose}
              btnText={getLanguageFromKey('Avbryt', props.language)}
              secondaryButton={true}
              className={classes.cancelButton}
            />
          </Grid>
        </Grid>
      </Grid>
    </Popover>
  );
}

export default ResetRepoModal;
