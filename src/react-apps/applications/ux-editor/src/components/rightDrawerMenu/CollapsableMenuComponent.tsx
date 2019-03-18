import { createStyles, List, ListItem, ListItemIcon, withStyles } from '@material-ui/core';
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
  children: any;
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

const CollapsableMenus = (props: ICollapsableMenuProps) => {
  const [menuIsOpen, setMenuIsOpen] = React.useState(false);
  const { classes } = props;

  const toggleMenu = () => {
    setMenuIsOpen(!menuIsOpen);
  };
  const handleKeyPress = (e: any) => {
    if (e.key === 'Enter') {
      toggleMenu();
    }
  };

  console.log(props.componentId);
  return (
    <List className={classes.list}>
      <ListItem
        className={classes.listItem + ' ' + classes.listItemHeader}
      >
        <ListItemIcon
          className={menuIsOpen ? classes.rotateDown : classes.rotateRight}
          onClick={toggleMenu}
          tabIndex={0}
          onKeyPress={handleKeyPress}
        >
          <i className={'ai ai-expand ' + classes.icon} />
        </ListItemIcon>
        <span className={classes.collapseHeader}>{props.header}</span>
      </ListItem>
      {menuIsOpen && typeof (props.listItems[0].name) !== 'undefined'
        && props.listItems.map((item, index) => {
          return (
            <div key={item.name}>
              <ListItem className={classes.listItem}>
                <span
                  className={classes.link}
                  onClick={item.action}
                >
                  {item.name}
                </span>
              </ListItem>
              {props.children}
            </div>
          );
        })
      }
    </List>
  );
};
export const CollapsableMenuComponent = withStyles(styles)(CollapsableMenus);
