import { createMuiTheme, createStyles, Grid, Popover, Typography, WithStyles, withStyles } from '@material-ui/core';
import * as React from 'react';
import AltinnButton from '../components/AltinnButton';
import AltinnIcon from '../components/AltinnIcon';
import AltinnInputField from '../components/AltinnInputField';
import AltinnAppTheme from '../theme/altinnAppTheme';
import { getLanguageFromKey } from '../utils/language';
import { get } from '../utils/networking';
import { sharedUrls } from '../utils/urlHelper';

const theme = createMuiTheme(AltinnAppTheme);

const styles = createStyles({
  modalContainer: {
    padding: 24,
    width: '319px',
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
});

export interface ICloneModalProps extends WithStyles<typeof styles> {
  anchorEl: Element;
  onClose: any;
  open: boolean;
  language: any;
}

function CloneModal(props: ICloneModalProps) {
  const [hasDataModel, setHasDataModel] = React.useState(false);

  const checkIfDataModelExists = async () => {
    try { // dataModelXsdUrl does not resolve in unit-tests
      const dataModel: any = await get(sharedUrls().dataModelXsdUrl);
      setHasDataModel(dataModel != null);
    } catch {
      setHasDataModel(false);
    }
  };

  const copyGitUrl = () => {
    const textField = document.querySelector('#repository-url');
    (textField as any).select();
    document.execCommand('copy');
  };

  const canCopy = () => {
    if (document.queryCommandSupported) {
      return document.queryCommandSupported('copy');
    }
    return false;
  };

  React.useEffect(() => {
    checkIfDataModelExists();
  }, []);

  return (
    <Popover
      open={props.open}
      anchorEl={props.anchorEl}
      onClose={props.onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
    >
      <Grid
        container={true} direction='column'
        className={props.classes.modalContainer}
      >
        <Grid item={true} className={props.classes.itemSeparator}>
          <Typography variant='body1' className={props.classes.blackText}>
            {getLanguageFromKey('sync_header.favourite_tool', props.language)}
          </Typography>
        </Grid>
        <Grid item={true} className={props.classes.sectionSeparator}>
          <Typography variant='body1'>
            <a
              href={sharedUrls().altinnDocsUrl} target='_blank'
              rel='noopener noreferrer'
            >
              {getLanguageFromKey('sync_header.favourite_tool_link', props.language)}
            </a>
          </Typography>
        </Grid>
        {!hasDataModel &&
          <Grid item={true} className={props.classes.sectionSeparator}>
            <Grid item={true} className={props.classes.itemSeparator}>
              <Typography variant='body1' className={props.classes.blackText}>
                <AltinnIcon
                  iconClass='ai ai-circle-exclamation'
                  iconColor={theme.altinnPalette.primary.blueDark}
                  iconSize={30}
                  padding='0px 0px 3px 0px'
                />
                {getLanguageFromKey('sync_header.data_model_missing', props.language)}
              </Typography>
            </Grid>
            <Grid item={true} className={props.classes.itemSeparator}>
              <Typography variant='body1' className={props.classes.blackText}>
                {getLanguageFromKey('sync_header.data_model_missing_helper', props.language)}
              </Typography>
            </Grid>
            <Grid item={true}>
              <Typography variant='body1'>
                <a href={sharedUrls().dataModelUploadPageUrl}>
                  {getLanguageFromKey('sync_header.data_model_missing_link', props.language)}
                </a>
              </Typography>
            </Grid>
          </Grid>
        }
        <Grid item={true}>
          <Typography variant='body1' className={props.classes.blackText}>
            {getLanguageFromKey('sync_header.clone_https', props.language)}
          </Typography>
        </Grid>
        <Grid item={true} className={props.classes.itemSeparator}>
          <AltinnInputField
            id='repository-url-form'
            inputValue={sharedUrls().repositoryGitUrl}
            textFieldId='repository-url'
            fullWidth={true}
          />
        </Grid>
        {canCopy() &&
          <Grid item={true}>
            <AltinnButton
              onClickFunction={copyGitUrl}
              btnText={getLanguageFromKey('sync_header.clone_https_button', props.language)}
              id='copy-repository-url-button'
            />
          </Grid>
        }
      </Grid>
    </Popover>
  );
}

export default withStyles(styles)(CloneModal);
