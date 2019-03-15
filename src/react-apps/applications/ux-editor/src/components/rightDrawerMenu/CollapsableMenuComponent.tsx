import { createStyles, List, ListItem, withStyles } from '@material-ui/core';
import * as React from 'react';
// import AltinnCheckBox from '../../../../shared/src/components/AltinnCheckBox';
import altinnTheme from '../../../../shared/src/theme/altinnStudioTheme';

const styles = createStyles({
  collapseHeader: {
    margin: '0 !important',
    padding: '0 !important',
  },
  icon: {
    padding: '0 0.6rem',
    width: '2.5rem !important',
    fontSize: '3rem',
  },
  link: {
    textDecoration: 'underline',
    textDecorationColor: altinnTheme.altinnPalette.primary.blueDark,
    cursor: 'pointer',
  },
  list: {
    padding: 0,
  },
  listItemHeader: {
    padding: '1.2rem 0',
    borderTop: '1px solid ' + altinnTheme.altinnPalette.primary.greyMedium,
  },
  listItem: {
    width: '100%',
    color: altinnTheme.altinnPalette.primary.blueDarker,
    fontSize: '1.6rem',
  },
  rotateDown: {
    transform: 'rotate(90deg)',
    fontSize: '1.3rem',
    margin: '0 !important',
    cursor: 'pointer',
  },
  rotateRight: {
    fontSize: '1.3rem',
    margin: '0 !important',
    cursor: 'pointer',
  },
});
export interface ICollapsableMenuProvidedProps {
  classes: any;
  header: string;
  componentId: string;
  listItems: ICollapsableMenuListItem[];
}

export interface ICollapsableMenuProps extends ICollapsableMenuProvidedProps {
  components: any;
  language: any;
}

export interface ICollapsableMenuState {
  menuIsOpen: boolean;
}

export interface ICollapsableMenuListItem {
  name: string;
  action?: () => void;
}

const CollapsableMenus = (props: any) => {
  const menuIsOpen = React.useState('false');
  const { classes } = props;

  console.log(menuIsOpen);
  console.log(props.componentId);
  console.log(props.listItems);
  return (
    <List className={classes.list}>
      <ListItem
        className={classes.listItem + ' ' + classes.listItemHeader}
      >
        {props.header}
      </ListItem>
    </List>
  );
};
export const CollapsableMenuComponent = withStyles(styles)(CollapsableMenus);
