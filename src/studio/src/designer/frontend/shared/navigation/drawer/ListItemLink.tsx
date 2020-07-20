import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as React from 'react';
import { Link as RouterLink, LinkProps as RouterLinkProps } from 'react-router-dom';
import AltinnIcon from '../../components/AltinnIcon';
import { IMenuItem } from './drawerMenuSettings';
import { styles } from './leftDrawerMenuStyles';

import altinnTheme from '../../theme/altinnStudioTheme';

export interface ListItemLinkProps {
    to: string;
    classes: any;
    menuItem: IMenuItem;
    index: number;
    activeLeftMenuSelection: boolean;
    onMouseEnterListItem: any;
    onMouseLeaveListItem: any;
    state: any;
}

function ListItemLink(props: ListItemLinkProps) {
  const {
    to,
    classes,
    index,
    menuItem,
    activeLeftMenuSelection,
    onMouseEnterListItem,
    onMouseLeaveListItem,
    state,
  } = props;
  const renderLink = React.useMemo(
    () => React.forwardRef<any, Omit<RouterLinkProps, 'to'>>((itemProps, ref) => (
      <RouterLink
        to={to}
        ref={ref}
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...itemProps}
      />)),
    [to],
  );
  return (
    <ListItem
      button={true}
      component={renderLink}
      classes={{
        root: classNames(classes.listItem,
          {
            [classes.activeListItem]: activeLeftMenuSelection,
          }),
      }}
      style={{ borderBottom: 0 }}
      onMouseEnter={onMouseEnterListItem}
      onMouseLeave={onMouseLeaveListItem}
    >

      <ListItemIcon>
        <AltinnIcon
          isActive={activeLeftMenuSelection}
          isActiveIconColor={altinnTheme.altinnPalette.primary.blueDark}
          iconClass={menuItem.iconClass}
          iconColor={state.iconColor[index] === undefined
            ? 'rgba(0, 0, 0, 0.54)' : state.iconColor[index]}
        />
      </ListItemIcon>
      <ListItemText
        disableTypography={true}
        primary={menuItem.displayText}
        classes={{ root: classNames(classes.listItemText) }}
      />

    </ListItem>
  );
}

export default withStyles(styles)(ListItemLink);
