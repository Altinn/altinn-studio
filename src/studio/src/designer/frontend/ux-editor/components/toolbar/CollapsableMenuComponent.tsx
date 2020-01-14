import { createStyles, ListItem, ListItemText, Theme, withStyles } from '@material-ui/core';
import classNames from 'classnames';
import * as React from 'react';
import { connect } from 'react-redux';
import { CollapsableMenus } from '../../containers/Toolbar';
import { getCollapsableMenuTitleByType } from '../../utils/language';
import AltinnIcon from 'app-shared/components/AltinnIcon';

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
        <div
          className={this.props.classes.listItemIcon}
        >
          <AltinnIcon
            iconClass={this.props.menuIsOpen ? 'fa fa-expand-alt fa-rotate-90' : 'fa fa-expand-alt '}
            iconColor={''}
          />
        </div>
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
    fontSize: '16px',
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
    color: 'rgba(0, 0, 0, 0.54)',
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
