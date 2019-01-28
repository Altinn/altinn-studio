import { createStyles, ListItem, ListItemIcon, ListItemText, Theme, withStyles } from '@material-ui/core';
import classNames from 'classnames';
import * as React from 'react';
import { connect } from 'react-redux';
import { CollapsableMenus } from '../../containers/Toolbar';
import { getCollapsableMenuTitleByType } from '../../utils/language';

export interface ICollapsableMenuProvidedProps {
  classes: any;
  onClick: any;
  menuType: CollapsableMenus;
  menuIsOpen: boolean;
}

export interface ICollapsableMenuProps extends ICollapsableMenuProvidedProps {
  language: any;
}

class ToolbarItem extends React.Component<ICollapsableMenuProps> {
  constructor(props: ICollapsableMenuProps) {
    super(props);
    this.handleKeyPress = this.handleKeyPress.bind(this);
  }

  public render(): JSX.Element {
    return (
      <ListItem
        classes={{ root: this.props.classes.collapsableButton }}
        onClick={this.props.onClick.bind(this, this.props.menuType)}
        onKeyPress={this.handleKeyPress}
        tabIndex={0}
      >
        <ListItemIcon
          classes={{ root: this.props.classes.listItemIcon }}
        >

          <svg width="14" height="9" viewBox="0 0 14 9"
            fill="none" xmlns="http://www.w3.org/2000/svg"
            transform={this.props.menuIsOpen ? "rotate(180)" : ''}
          >
            <path d="M6.57895 9L0.0153904 -2.51244e-08L13.1425 8.834e-07L6.57895 9Z" fill="#C9C9C9" />
          </svg>

        </ListItemIcon>
        <ListItemText
          classes={{
            root: classNames(this.props.classes.collapsableButtonTextRoot),
            primary: classNames(this.props.classes.collapsableButtonText),
          }}
        >
          {getCollapsableMenuTitleByType(this.props.menuType, this.props.language)}
        </ListItemText>
      </ListItem>
    );
  }

  private handleKeyPress(event: any) {
    if (event.key === 'Enter') {
      this.props.onClick(this.props.menuType);
    }
  }
}

const styles = (theme: Theme) => createStyles({
  collapsableButtonText: {
    fontSize: '14px',
    marginLeft: '6px',
    padding: '0px',
    color: '#022F51',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  collapsableButtonTextRoot: {
    padding: '0px',
  },
  collapsableButton: {
    padding: '0px',
  },
  listItemIcon: {
    marginLeft: 'auto',
    marginRight: 'auto',
  },
});

const mapStateToProps: (
  state: IAppState,
  props: ICollapsableMenuProvidedProps,
) => ICollapsableMenuProps = (state: IAppState, props: ICollapsableMenuProvidedProps) => ({
  language: state.appData.language.language,
  onClick: props.onClick,
  classes: props.classes,
  menuIsOpen: props.menuIsOpen,
  menuType: props.menuType,
});

export const CollapsableMenuComponent =
  withStyles(styles, { withTheme: true })(connect(mapStateToProps)(ToolbarItem));
