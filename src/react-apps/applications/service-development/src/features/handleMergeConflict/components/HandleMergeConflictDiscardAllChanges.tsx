// import { List, ListItem, ListItemText, Paper, Typography, ListItemIcon } from '@material-ui/core';
import Grid from '@material-ui/core/Grid';
import { createMuiTheme, createStyles, withStyles, WithStyles } from '@material-ui/core/styles';
import * as React from 'react';
import altinnTheme from '../../../../../shared/src/theme/altinnStudioTheme';
import { getLanguageFromKey } from '../../../../../shared/src/utils/language';

import classNames from 'classnames';
import AltinnIcon from '../../../../../shared/src/components/AltinnIcon';

const theme = createMuiTheme(altinnTheme);

const styles = () => createStyles({
  text: {
    'color': theme.altinnPalette.primary.blueDarker,
    '&:hover': {
      textDecoration: 'underline',
    },
  },
});

export interface IHandleMergeConflictDiscardAllChangesProps extends WithStyles<typeof styles> {
  language: any;
}

export interface IHandleMergeConflictDiscardAllChangesState {

}

class HandleMergeConflictDiscardAllChanges extends
  React.Component<IHandleMergeConflictDiscardAllChangesProps, IHandleMergeConflictDiscardAllChangesState> {

  constructor(_props: IHandleMergeConflictDiscardAllChangesProps) {
    super(_props);
  }

  public render() {
    const { classes } = this.props;
    return (
      <React.Fragment>

        <AltinnIcon
          isActive={false}
          iconClass='ai ai-undo'
          iconColor={theme.altinnPalette.primary.blueDarker}
          iconSize={20}
        />
        <span
          className={classes.text}
        >
          {getLanguageFromKey('handle_merge_conflict.discard_all_local_changes', this.props.language)}
        </span>

      </React.Fragment >
    );
  }
}

export default withStyles(styles)(HandleMergeConflictDiscardAllChanges);
