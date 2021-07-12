import { createMuiTheme, Grid, makeStyles, Popover, Typography } from '@material-ui/core';
import * as React from 'react';
import AltinnButton from 'app-shared/components/AltinnButton';
import AltinnInputField from 'app-shared/components/AltinnInputField';
import studioTheme from 'app-shared/theme/altinnStudioTheme';
import { getLanguageFromKey, getParsedLanguageFromKey } from 'app-shared/utils/language';
import { useSelector } from 'react-redux';
import AltinnSpinner from 'app-shared/components/AltinnSpinner';

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
  anchorEl: null | Element | ((element: Element) => Element);
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

  const resetting: boolean = useSelector((state: IServiceDevelopmentState) => state.repoStatus.resettingLocalRepo);

  React.useEffect(() => {
    if (deleteRepoName === props.repositoryName) {
      setCanDelete(true);
    } else {
      setCanDelete(false);
    }
  }, [deleteRepoName, props.repositoryName]);

  const onDeleteRepoNameChange = (event: any) => {
    setDeleteRepoName(event.target.value);
  };

  const onResetWrapper = () => {
    setCanDelete(false);
    props.handleClickResetRepo();
  };

  const onCloseWrapper = () => {
    setDeleteRepoName('');
    props.onClose();
  };

  return (
    <div data-testid='reset-repo-container'>
      <Popover
        open={props.open}
        anchorEl={props.anchorEl}
        onClose={onCloseWrapper}
        anchorOrigin={{
          vertical: 'center',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'center',
          horizontal: 'center',
        }}
        data-testid='reset-repo-popover'
      >
        <Grid
          container={true}
          direction='column'
          className={classes.modalContainer}
        >
          <Grid item={true} className={classes.itemSeparator}>
            <Typography className={classes.sidebarHeader}>
              {getLanguageFromKey('administration.reset_repo_confirm_heading', props.language)}
            </Typography>
          </Grid>
          <Grid item={true} className={classes.sectionSeparator}>
            <Typography variant='body1'>
              {getParsedLanguageFromKey('administration.reset_repo_confirm_info', props.language, [props.repositoryName], true)}
            </Typography>
          </Grid>
          <Grid item={true}>
            <label htmlFor='delete-repo-name'>
              <Typography variant='body1' className={classes.blackText}>
                {getLanguageFromKey('administration.reset_repo_confirm_repo_name', props.language)}
              </Typography>
            </label>
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
            {resetting ?
              <Grid item={true} xs={6}>
                <AltinnSpinner />
              </Grid>
              :
              <>
                <Grid item={true} xs={6}>
                  <AltinnButton
                    onClickFunction={onResetWrapper}
                    btnText={getLanguageFromKey('administration.reset_repo_button', props.language)}
                    id='confirm-reset-repo-button'
                    disabled={!canDelete}
                    className={classes.confirmButton}
                    data-testid='confirm-reset-repo-button'
                  />
                </Grid>
                <Grid item={true} xs={6}>
                  <AltinnButton
                    onClickFunction={onCloseWrapper}
                    btnText={getLanguageFromKey('general.cancel', props.language)}
                    secondaryButton={true}
                    className={classes.cancelButton}
                  />
                </Grid>
              </>
            }
          </Grid>
        </Grid>
      </Popover>
    </div>
  );
}

export default ResetRepoModal;
