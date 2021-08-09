import { List, ListItem, ListItemIcon, ListItemText } from '@material-ui/core';
import { createTheme, createStyles, withStyles, WithStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as React from 'react';
import AltinnIcon from 'app-shared/components/AltinnIcon';
import altinnTheme from 'app-shared/theme/altinnStudioTheme';

const theme = createTheme(altinnTheme);

const styles = () => createStyles({
  root: {
    paddingTop: 0,
    paddingBottom: 0,
    height: '100%',
    background: theme.altinnPalette.primary.white,
    boxShadow: theme.sharedStyles.boxShadow,
  },
  listItemFocusVisible: {
    backgroundColor: theme.altinnPalette.primary.white,
    textDecoration: 'underline',
    color: theme.altinnPalette.primary.blueDark,
    border: theme.accessibility.focusVisible.border,
  },
  listItemIcon: {
    marginRight: 6,
  },
  listItemButton: {
    transition: 'none',
    backgroundColor: theme.altinnPalette.primary.white,
    '&:hover': {
      color: theme.altinnPalette.primary.blueDark,
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

export class HandleMergeConflictFileList extends
  React.Component<IHandleMergeConflictFileListProps, IHandleMergeConflictFileListState> {
  constructor(_props: IHandleMergeConflictFileListProps) {
    super(_props);
    this.state = {
      selectedIndex: null,
    };
  }

  public handleListItemClick = (index: number, item: any) => () => {
    this.setState({ selectedIndex: index });
    this.props.changeSelectedFile(item.filePath);
  }

  public render() {
    const { classes, repoStatus } = this.props;
    const { selectedIndex } = this.state;

    return (
      <React.Fragment>
        {repoStatus.contentStatus ?
          <List
            id='handleMergeConflictFileList'
            classes={{
              root: classNames(classes.root),
            }}
          >
            {repoStatus.contentStatus && repoStatus.contentStatus.length > 0 ?

              repoStatus.contentStatus.map((item: any, index: any) => {
                return (
                  <ListItem
                    id={`handleMergeConflictFileListItem${index}`}
                    button={true}
                    // eslint-disable-next-line react/no-array-index-key
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
                        isActive={selectedIndex === index}
                        isActiveIconColor={item.fileStatus === 'Conflicted' ?
                          theme.altinnPalette.primary.blueDark : theme.altinnPalette.primary.green
                        }
                        iconClass={item.fileStatus === 'Conflicted' ?
                          'fa fa-circlecancel' : 'fa fa-check'
                        }
                        iconColor={item.fileStatus === 'Conflicted' ?
                          theme.altinnPalette.primary.blueDarker : theme.altinnPalette.primary.green
                        }
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
              })
              :
              null
            }

          </List>
          :
          null
        }
      </React.Fragment >
    );
  }
}

export default withStyles(styles)(HandleMergeConflictFileList);
