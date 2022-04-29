import {
  createStyles,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  withStyles,
} from '@material-ui/core';
import classNames from 'classnames';
import React from 'react';
import { connect } from 'react-redux';
import { getComponentTitleByComponentType } from '../../utils/language';
import type { IAppState } from '../../types/global';

export interface IToolbarItemProvidedProps {
  classes: any;
  componentType: string;
  onClick: any;
  thirdPartyLabel?: string;
  icon: string;
}

export interface IToolbarItemProps extends IToolbarItemProvidedProps {
  language: any;
}

// eslint-disable-next-line react/prefer-stateless-function
class ToolbarItem extends React.Component<IToolbarItemProps> {
  public render(): JSX.Element {
    return (
      <Paper
        square={true}
        classes={{ root: classNames(this.props.classes.paper) }}
      >
        <ListItem
          classes={{ root: classNames(this.props.classes.listItem) }}
          component='div'
        >
          <ListItemIcon
            classes={{ root: classNames(this.props.classes.listComponentIcon) }}
          >
            <i className={this.props.icon} />
          </ListItemIcon>
          <ListItemText
            classes={{
              primary: classNames(this.props.classes.listItemText),
              root: classNames(this.props.classes.listItemTextRoot),
            }}
          >
            {this.props.thirdPartyLabel == null
              ? getComponentTitleByComponentType(
                  this.props.componentType,
                  this.props.language,
                )
              : this.props.thirdPartyLabel}
          </ListItemText>
          <ListItemIcon
            classes={{ root: classNames(this.props.classes.listItemIcon) }}
            // eslint-disable-next-line react/jsx-no-bind
            onClick={this.props.onClick.bind(this, this.props.componentType)}
          >
            <i className={`fa fa-help-circle ${this.props.classes.helpIcon}`} />
          </ListItemIcon>
        </ListItem>
      </Paper>
    );
  }
}

const styles = () =>
  createStyles({
    searchBox: {
      border: '1px solid #0062BA',
      marginTop: '10px',
      marginBottom: '24px',
      background: 'none',
    },
    searchBoxInput: {
      fontSize: '14px',
      color: '#6A6A6A',
      padding: '6px',
    },
    searchBoxIcon: {
      color: '#000000',
    },
    listItemText: {
      fontSize: '14px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    listItemTextRoot: {
      paddingRight: '0px',
    },
    listItem: {
      cursor: 'grab',
      paddingLeft: '12px',
      paddingRight: '8px',
      paddingTop: '9px',
      paddingBottom: '8px',
    },
    paper: {
      marginBottom: '6px',
      backgroundColor: '#FFFFFF',
    },
    helpOutline: {
      width: '24px',
      height: '24px',
    },
    listItemIcon: {
      marginLeft: 'auto',
      marginRight: 'auto',
    },
    listComponentIcon: {
      minWidth: '40px',
    },
    helpIcon: {
      color: '#0062BA',
      cursor: 'pointer',
      fontSize: '2em !important',
      '&:hover': {
        color: '#000000',
      },
    },
  });

const mapStateToProps: (
  state: IAppState,
  props: IToolbarItemProvidedProps,
) => IToolbarItemProps = (
  state: IAppState,
  props: IToolbarItemProvidedProps,
) => ({
  language: state.appData.languageState.language,
  componentType: props.componentType,
  onClick: props.onClick,
  classes: props.classes,
  thirdPartyLabel: props.thirdPartyLabel,
  icon: props.icon,
});

export const ToolbarItemComponent = withStyles(styles, { withTheme: true })(
  connect(mapStateToProps)(ToolbarItem),
);
