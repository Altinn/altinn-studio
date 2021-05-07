/* eslint-disable import/no-cycle */
import { createStyles, ListItem, ListItemText, withStyles } from '@material-ui/core';
import classNames from 'classnames';
import * as React from 'react';
import { connect } from 'react-redux';
import AltinnIcon from 'app-shared/components/AltinnIcon';
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

  private handleKeyPress(event: any) {
    if (event.key === 'Enter') {
      this.props.onClick(this.props.menuType);
    }
  }

  public render(): JSX.Element {
    return (
      <ListItem
        classes={{ root: this.props.classes.collapsableButton }}
        // eslint-disable-next-line react/jsx-no-bind
        onClick={this.props.onClick.bind(this, this.props.menuType)}
        onKeyPress={this.handleKeyPress}
        tabIndex={0}
        component='div'
      >
        <div
          className={this.props.classes.listItemIcon}
        >
          <AltinnIcon
            iconClass={this.props.menuIsOpen ? 'fa fa-expand-alt fa-rotate-90' : 'fa fa-expand-alt '}
            iconColor=''
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
}

const styles = () => createStyles({
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
    cursor: 'pointer',
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
  language: state.appData.languageState.language,
  onClick: props.onClick,
  classes: props.classes,
  menuIsOpen: props.menuIsOpen,
  menuType: props.menuType,
});

export const CollapsableMenuComponent =
  withStyles(styles, { withTheme: true })(connect(mapStateToProps)(ToolbarItem));
