import { List, ListItem, ListItemIcon, ListItemText } from '@material-ui/core';
import { createMuiTheme, createStyles, withStyles, WithStyles } from '@material-ui/core/styles';
import * as React from 'react';
import altinnTheme from '../../../../../shared/src/theme/altinnStudioTheme';

import classNames from 'classnames';
import AltinnIcon from '../../../../../shared/src/components/AltinnIcon';

const theme = createMuiTheme(altinnTheme);

const styles = () => createStyles({
  root: {
    paddingTop: 0,
    paddingBottom: 0,
    height: '100%',
    background: theme.altinnPalette.primary.white,
    boxShadow: theme.sharedStyles.boxShadow,
  },
  listItemFocusVisible: {
    backgroundColor: '#fff',
    textDecoration: 'underline',
    color: theme.altinnPalette.primary.blueDark,
    border: theme.accessability.focusVisible.border,
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

export interface IHandleMergeConflictFileListProps extends WithStyles<typeof styles> {
  changeSelectedFile: (file: string) => void;
  language: any;
  repoStatus: any;
}

export interface IHandleMergeConflictFileListState {
  selectedIndex: number;
}

class HandleMergeConflictFileList extends
  React.Component<IHandleMergeConflictFileListProps, IHandleMergeConflictFileListState> {

  constructor(_props: IHandleMergeConflictFileListProps) {
    super(_props);
    this.state = {
      selectedIndex: null,
    };
  }

  public handleListItemClick = (index: number, item: any) => () => {
    console.log('handleListItemClick item', item);
    this.setState({ selectedIndex: index });
    this.props.changeSelectedFile(item.filePath);
  }

  public render() {
    const { classes, repoStatus } = this.props;
    const { selectedIndex } = this.state;

    return (
      <React.Fragment>
        <List
          classes={{
            root: classNames(classes.root),
          }}
        >
          {repoStatus.contentStatus.length > 0 ? repoStatus.contentStatus.map((item: any, index: any) => {
            return (
              <ListItem
                button={true}
                key={index}
                selected={selectedIndex === index}
                onClick={this.handleListItemClick(index, item)}
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
