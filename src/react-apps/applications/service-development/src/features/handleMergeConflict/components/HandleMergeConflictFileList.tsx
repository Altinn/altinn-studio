import { List, ListItem, ListItemText, Paper, Typography, ListItemIcon } from '@material-ui/core';
import Grid from '@material-ui/core/Grid';
import { createMuiTheme, createStyles, withStyles, WithStyles } from '@material-ui/core/styles';
import * as React from 'react';
import altinnTheme from '../../../../../shared/src/theme/altinnStudioTheme';

import classNames from 'classnames';
import AltinnIcon from '../../../../../shared/src/components/AltinnIcon';

const theme = createMuiTheme(altinnTheme);

const styles = () => createStyles({
  listItemFocusVisible: {
    backgroundColor: '#fff',
    textDecoration: 'underline',
    color: theme.altinnPalette.primary.blueDark,
    border: theme.accessability.focusVisible.border,
    margin: -2,
  },
  listItemIcon: {
    marginRight: 6,
  },
  listItemButton: {
    'transition': 'none',
    'backgroundColor': '#fff',
    '&:hover': {
      'color': theme.altinnPalette.primary.blueDark,
      'textDecoration': 'underline',
      // Reset on touch devices, it doesn't add specificity
      '@media (hover: none)': {
        backgroundColor: 'transparent',
      },
    },
  },
  listItemText: {
    padding: '0',
  },
  primaryText: {
    fontSize: 16,
  },
  primaryTextSelected: {
    color: theme.altinnPalette.primary.blueDark,
    textDecoration: 'underline',
  },
  primaryTextUnselected: {
    color: theme.altinnPalette.primary.blueDarker,
  },
  secondaryText: {
    color: theme.altinnPalette.primary.blue,
    fontSize: 12,
  },
});

export interface IHandleMergeConflictContainerProps extends WithStyles<typeof styles> {
  repoStatus: any;
}

export interface IHandleMergeConflictContainerState {
  selectedIndex: number;
}

class HandleMergeConflictFileList extends
  React.Component<IHandleMergeConflictContainerProps, IHandleMergeConflictContainerState> {

  constructor(_props: IHandleMergeConflictContainerProps) {
    super(_props);
    this.state = {
      selectedIndex: null,
    };
  }

  public handleListItemClick = (index: number) => () => {
    this.setState({ selectedIndex: index });
  }

  public render() {
    const { classes, repoStatus } = this.props;
    const { selectedIndex } = this.state;

    return (
      <React.Fragment>
        <List>
          {repoStatus.contentStatus.length > 0 ? repoStatus.contentStatus.map((item: any, index: any) => {
            return (
              <ListItem
                button={true}
                key={index}
                // selected={selectedIndex === index}
                onClick={this.handleListItemClick(index)}
                classes={{
                  button: classNames(classes.listItemButton),
                  focusVisible: classNames(classes.listItemFocusVisible),
                }}
              >
                <ListItemIcon
                  classes={{
                    root: classNames(classes.listItemIcon),
                  }}
                >
                  <AltinnIcon
                    isActive={true}
                    iconClass='ai ai-circlecancel'
                    iconColor='#022F51'
                    iconSize={16}
                  />
                </ListItemIcon>
                <ListItemText
                  primary={item.filePath}
                  classes={{
                    primary: classNames(classes.primaryText,
                      {
                        [classes.primaryTextSelected]: selectedIndex === index,
                        [classes.primaryTextUnselected]: !selectedIndex === index,
                      }),
                    root: classNames(classes.listItemText),
                  }}
                />
              </ListItem>
            );
          }) : null}

        </List>
      </React.Fragment >
    );
  }
}

export default withStyles(styles)(HandleMergeConflictFileList);
