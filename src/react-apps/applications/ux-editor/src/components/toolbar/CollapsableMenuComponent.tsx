import { createStyles, ListItem, ListItemIcon, ListItemText, Theme, withStyles } from '@material-ui/core';
import { ExpandLess, ExpandMore } from '@material-ui/icons';
import classNames = require('classnames');
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
  public render(): JSX.Element {
    return (
      <ListItem
        classes={{ root: this.props.classes.collapsableButton }}
        onClick={this.props.onClick.bind(this, this.props.menuType)}
      >
        <ListItemIcon
          classes={{ root: this.props.classes.listItemIcon }}
        >
          {(this.props.menuIsOpen) ? <ExpandLess /> : <ExpandMore />}
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
}

const styles = (theme: Theme) => createStyles({
  collapsableButtonText: {
    fontSize: '14px',
    marginLeft: '6px',
    padding: '0px',
  },
  collapsableButtonTextRoot: {
    padding: '0px',
  },
  collapsableButton: {
    padding: '0px',
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
