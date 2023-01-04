import React from 'react';
import { List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import classNames from 'classnames';
import AltinnIcon from 'app-shared/components/AltinnIcon';
import classes from './HandleMergeConflictFileList.module.css';


interface IHandleMergeConflictFileListProps {
  changeSelectedFile: (file: string) => void;
  language: any;
  repoStatus: any;
}

interface IHandleMergeConflictFileListState {
  selectedIndex: number;
}

export class HandleMergeConflictFileList extends React.Component<
  IHandleMergeConflictFileListProps,
  IHandleMergeConflictFileListState
> {
  constructor(_props: IHandleMergeConflictFileListProps) {
    super(_props);
    this.state = {
      selectedIndex: null,
    };
  }

  public handleListItemClick = (index: number, item: any) => () => {
    this.setState({ selectedIndex: index });
    this.props.changeSelectedFile(item.filePath);
  };

  public render() {
    const { repoStatus } = this.props;
    const { selectedIndex } = this.state;

    return (
      <React.Fragment>
        {repoStatus.contentStatus ? (
          <List
            id='handleMergeConflictFileList'
            classes={{ root: classes.root }}
          >
            {repoStatus.contentStatus && repoStatus.contentStatus.length > 0
              ? repoStatus.contentStatus.map((item: any, index: any) => {
                  return (
                    <ListItem
                      role='listitem'
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
                          isActiveIconColor={
                            item.fileStatus === 'Conflicted'
                              ? '#0062BA'
                              : '#12AA64'
                          }
                          iconClass={
                            item.fileStatus === 'Conflicted' ? 'fa fa-circlecancel' : 'fa fa-check'
                          }
                          iconColor={
                            item.fileStatus === 'Conflicted'
                              ? '#022F51'
                              : '#12AA64'
                          }
                          iconSize={16}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={item.filePath}
                        classes={{
                          primary: classNames(classes.primaryText, {
                            [classes.primaryTextSelected]: selectedIndex === index,
                            [classes.primaryTextUnselected]: !selectedIndex === index,
                          }),
                          root: classes.listItemText,
                        }}
                      />
                    </ListItem>
                  );
                })
              : null}
          </List>
        ) : null}
      </React.Fragment>
    );
  }
}

export default HandleMergeConflictFileList;
