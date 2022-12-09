import { Typography, makeStyles, Collapse, List, ListItem, ListItemIcon, ListItemText } from '@material-ui/core';
import React from 'react';
import cn from 'classnames';

import type { IAttachment } from 'src/types/shared';
import { AltinnIcon } from '../AltinnIcon';
import AltinnAttachmentComponent from '../atoms/AltinnAttachment';

const useStyles = makeStyles(() => ({
  listItemTextPadding: {
    paddingLeft: '0',
  },
  transformArrowRight: {
    transform: 'rotate(-90deg)',
  },
  transition: {
    transitionDuration: '0.1s',
    minWidth: '0px',
    marginRight: '10px',
  },
  collapsedTitle: {
    fontSize: '20px',
  },
}));

interface IAltinnCollapsibleAttachmentsProps {
  attachments?: IAttachment[];
  collapsible?: boolean;
  title?: React.ReactNode;
  hideCount?: boolean;
}

const fontStyle = {
  fontSize: 18,
  fontWeight: 600,
};

export function AltinnCollapsibleAttachments({
  attachments,
  collapsible,
  title,
  hideCount,
}: IAltinnCollapsibleAttachmentsProps) {
  const [open, setOpen] = React.useState(true);
  const classes = useStyles();

  function handleOpenClose() {
    setOpen(!open);
  }

  const attachmentCount = hideCount ? '' : `(${attachments && attachments.length})`;

  return (
    <>
      {collapsible ? (
        <List
          component='nav'
          id='attachment-collapsible-list'
        >
          <ListItem
            button={true}
            onClick={handleOpenClose}
            disableGutters={true}
          >
            <ListItemIcon
              classes={{
                root: cn({ [classes.transformArrowRight]: !open }, classes.transition),
              }}
            >
              <AltinnIcon
                iconClass='ai ai-arrow-down'
                iconColor='#1EADF7'
                iconSize='1.6rem'
              />
            </ListItemIcon>
            <ListItemText
              primary={`${title} ${attachmentCount}`}
              classes={{
                root: cn(classes.listItemTextPadding),
                primary: cn(classes.collapsedTitle),
              }}
            />
          </ListItem>
          <Collapse
            in={open}
            timeout='auto'
            unmountOnExit={true}
          >
            <AltinnAttachmentComponent
              attachments={attachments}
              nested={true}
              listDisableVerticalPadding={true}
            />
          </Collapse>
        </List>
      ) : (
        <>
          <Typography style={fontStyle}>
            {title} {attachmentCount}
          </Typography>
          <AltinnAttachmentComponent
            attachments={attachments}
            nested={false}
            listDisableVerticalPadding={false}
            id='attachment-list'
          />
        </>
      )}
    </>
  );
}

export default AltinnCollapsibleAttachments;
