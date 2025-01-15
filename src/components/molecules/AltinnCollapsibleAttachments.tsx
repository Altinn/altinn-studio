import React from 'react';

import { Collapse, List, ListItem, ListItemIcon, ListItemText, Typography } from '@material-ui/core';
import { CaretDownFillIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

import { AltinnAttachment } from 'src/components/atoms/AltinnAttachment';
import classes from 'src/components/molecules/AltinnCollapsibleAttachments.module.css';
import { useLanguage } from 'src/features/language/useLanguage';
import type { IDisplayAttachment } from 'src/types/shared';

interface IAltinnCollapsibleAttachmentsProps {
  attachments?: IDisplayAttachment[];
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
  const { elementAsString } = useLanguage();

  function handleOpenClose() {
    setOpen(!open);
  }

  const attachmentCount = hideCount ? '' : `(${attachments && attachments.length})`;

  return collapsible ? (
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
          <CaretDownFillIcon
            aria-hidden='true'
            fontSize='1.5rem'
          />
        </ListItemIcon>
        <ListItemText
          primary={`${elementAsString(title)} ${attachmentCount}`}
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
        <AltinnAttachment attachments={attachments} />
      </Collapse>
    </List>
  ) : (
    <>
      <Typography style={fontStyle}>
        {title} {attachmentCount}
      </Typography>
      <AltinnAttachment
        attachments={attachments}
        id='attachment-list'
      />
    </>
  );
}
