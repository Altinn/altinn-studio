
import { Typography } from '@material-ui/core';
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
    minWidth: '0px',
    marginRight: '10px'
  },
  collapsedTitle: {
    fontSize: '20px',
  },
});

interface IAltinnCollapsibleAttachmentsProps extends WithStyles<typeof styles> {
  attachments?: IAttachment[];
  collapsible?: boolean;
  title?: string;
  hideCount?: boolean;
}

export function AltinnCollapsibleAttachments(props: IAltinnCollapsibleAttachmentsProps) {
  const [open, setOpen] = React.useState(true);

  function handleOpenClose() {
    setOpen(!open);
  }

  const attachmentCount = props.hideCount ? '' : `(${props.attachments && props.attachments.length})`;

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
              primary={`${props.title} ${attachmentCount}`}
              classes={{
                root: classNames(props.classes.listItemTextPadding),
                primary: classNames(props.classes.collapsedTitle),
              }}
            />
          </ListItem>
          <Collapse in={open} timeout='auto' unmountOnExit={true}>
            <AltinnAttachment
              attachments={props.attachments}
              nested={true}
              listDisableVerticalPadding={true}
            />
          </Collapse>
        </List>
      ) : (
        <>
          <Typography style={{ fontSize: 18, fontWeight: 600 }}>
            {`${props.title} ${attachmentCount}`}
          </Typography>
          <AltinnAttachment
            attachments={props.attachments}
            nested={false}
            listDisableVerticalPadding={false}
          />
        </>

      )}
    </>
  );

}

export default withStyles(styles)(AltinnCollapsibleAttachments);
