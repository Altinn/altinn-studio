import { createStyles, ListItem, ListItemIcon, ListItemText, Paper, Theme, withStyles } from '@material-ui/core';
import { HelpOutline } from '@material-ui/icons';
import classNames = require('classnames');
import * as React from 'react';
import { connect } from 'react-redux';
import { ComponentTypes } from '..';
import { getComponentTitleByComponentType } from '../../utils/language';

export interface IToolbarItemProvidedProps {
  classes: any;
  componentType?: ComponentTypes;
  onClick: any;
  thirdPartyLabel?: string;
}

export interface IToolbarItemProps extends IToolbarItemProvidedProps {
  language: any;
}

class ToolbarItem extends React.Component<IToolbarItemProps> {
  public render(): JSX.Element {
    return (
      <Paper square={true} classes={{ root: classNames(this.props.classes.paper) }}>
        <ListItem classes={{ root: classNames(this.props.classes.listItem) }}>
          <ListItemText classes={{ primary: classNames(this.props.classes.listItemText) }}>
            {(this.props.thirdPartyLabel == null) ?
              getComponentTitleByComponentType(this.props.componentType, this.props.language) :
              this.props.thirdPartyLabel
            }
          </ListItemText>
          <ListItemIcon classes={{ root: classNames(this.props.classes.listItemIcon) }}>
            <HelpOutline
              classes={{ root: classNames(this.props.classes.helpOutline) }}
              onClick={this.props.onClick.bind(this, this.props.componentType)}
            />
          </ListItemIcon>
        </ListItem>
      </Paper>
    );
  }
}

const styles = (theme: Theme) => createStyles({
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
  listItem: {
    paddingLeft: '12px',
    paddingRight: '8px',
    paddingTop: '9px',
    paddingBottom: '8px',
  },
  paper: {
    marginBottom: '6px',
  },
  helpOutline: {
    width: '24px',
    height: '24px',
  },
  listItemIcon: {
    marginLeft: 'auto',
    marginRight: 'auto',
  },
});

const mapStateToProps: (
  state: IAppState,
  props: IToolbarItemProvidedProps,
) => IToolbarItemProps = (state: IAppState, props: IToolbarItemProvidedProps) => ({
  language: state.appData.language.language,
  componentType: props.componentType,
  onClick: props.onClick,
  classes: props.classes,
  thirdPartyLabel: props.thirdPartyLabel,
});

export const ToolbarItemComponent =
  withStyles(styles, { withTheme: true })(connect(mapStateToProps)(ToolbarItem));
