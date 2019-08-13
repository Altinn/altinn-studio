/* tslint:disable:max-line-length */
import Collapse from '@material-ui/core/Collapse';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import createStyles from '@material-ui/core/styles/createStyles';
import withStyles, { WithStyles } from '@material-ui/core/styles/withStyles';
import classNames from 'classnames';
import * as React from 'react';
import { IAttachment } from '../../types';
import { AltinnIcon } from '../AltinnIcon';
import AltinnAttachment from '../atoms/AltinnAttachment';

const styles = createStyles({
  listItemTextPadding: {
    paddingLeft: '0',
  },
  transformArrowRight: {
    transform: 'rotate(-90deg)',
  },
  transition: {
    transitionDuration: '0.1s',
  },
});

interface IAltinnAttachmentsProps extends WithStyles<typeof styles> {
  attachments?: IAttachment[];
  collapsible?: boolean;
  collapsibleTitle?: string;
}

export function AltinnAttachments(props: IAltinnAttachmentsProps) {
  const [open, setOpen] = React.useState(true);

  function handleOpenClose() {
    setOpen(!open);
  }

  return(
    <>
      {props.collapsible ? (
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
            <ListItemText
              primary={`${props.collapsibleTitle && props.collapsibleTitle} (${props.attachments && props.attachments.length})`}
              classes={{
                root: classNames(props.classes.listItemTextPadding),
              }}
            />
          </ListItem>
          <Collapse in={open} timeout='auto' unmountOnExit={true}>
            <AltinnAttachment
              attachments={props.attachments}
              nested={true}
              listDisablePadding={true}
            />
          </Collapse>
        </List>
      ) : (
        <AltinnAttachment
          attachments={props.attachments}
          nested={false}
          listDisablePadding={false}
        />
      )}
    </>
  );

}

export default withStyles(styles)(AltinnAttachments);
