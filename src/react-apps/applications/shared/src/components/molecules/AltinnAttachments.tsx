import * as React from 'react';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import Collapse from '@material-ui/core/Collapse';
import { AltinnIcon } from '../AltinnIcon';

import createMuiTheme from '@material-ui/core/styles/createMuiTheme';
import createStyles from '@material-ui/core/styles/createStyles';
import withStyles, { WithStyles } from '@material-ui/core/styles/withStyles';
import Typography from '@material-ui/core/Typography';

import AltinnAppTheme from '../../theme/altinnAppTheme';

import classNames from 'classnames';

const theme = createMuiTheme(AltinnAppTheme);

const styles = createStyles({
  nested: {
    paddingLeft: '3.2rem',
  },
  transformArrowRight: {
    transform: 'rotate(-90deg)',
  },
  transition: {
    transitionDuration: '0.1s',
  },
});

export interface IAltinnAttachmentsProps extends WithStyles<typeof styles> {
  language?: any;
}

export function AltinnAttachments(props: IAltinnAttachmentsProps) {
  const [open, setOpen] = React.useState(true);

  function handleOpenClose() {
    setOpen(!open);
  }

  return(
    <>
      <List
        component='nav'
      >
        <ListItem button={true} onClick={handleOpenClose} disableGutters={true}>
          <ListItemIcon
            classes={{
              root: classNames(
                {[props.classes.transformArrowRight]: !open},
                props.classes.transition,
              ),
            }}
          >
            <AltinnIcon
              iconClass='ai ai-arrow-down'
              iconColor='#1EADF7'
              iconSize='1.6rem'
            />
          </ListItemIcon>
          <ListItemText primary='Filvedlegg (x)' />
        </ListItem>
        <Collapse in={open} timeout='auto' unmountOnExit={true}>
          <List disablePadding={true}>
            <ListItem button={true} className={props.classes.nested}>
              <ListItemIcon>
                <AltinnIcon
                  iconClass='reg reg-attachment'
                  iconColor='#000000'
                  iconSize='5rem'
                />
              </ListItemIcon>
              <ListItemText primary='filvedlegg5345' />
            </ListItem>
            <ListItem button={true} className={props.classes.nested}>
              <ListItemIcon>
                <AltinnIcon
                  iconClass='reg reg-attachment'
                  iconColor='#000000'
                  iconSize='5rem'
                />
              </ListItemIcon>
              <ListItemText primary='en.doc' />
            </ListItem>
          </List>
        </Collapse>
      </List>
    </>
  );

}

export default withStyles(styles)(AltinnAttachments);
