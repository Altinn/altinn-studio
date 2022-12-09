import React from 'react';

import { List, ListItem, ListItemIcon, ListItemText, makeStyles, Typography } from '@material-ui/core';
import cn from 'classnames';

import { AltinnIcon } from 'src/components/AltinnIcon';
import { makeUrlRelativeIfSameDomain } from 'src/utils/urls/urlHelper';
import type { IAttachment } from 'src/types/shared';

const useStyles = makeStyles(() => ({
  a: {
    '&:hover': {
      borderBottom: '0px',
    },
    '&:focus': {
      borderBottom: '0px',
    },
    '&:active': {
      borderBottom: '0px',
    },
    '&:after': {
      display: 'none !important',
    },
  },
  listItemPadding: {
    paddingLeft: '2.0rem',
  },
  listItemPaddingNone: {
    paddingLeft: '0rem',
  },
  listItemTextPadding: {
    paddingLeft: '0',
  },
  inline: {
    display: 'inline',
  },
  primaryText: {
    fontWeight: 600,
  },
}));

interface IAltinnAttachmentProps {
  /** Attachments array with objects. See code example. */
  attachments?: IAttachment[];
  /** Disables vertical padding (does not currently work in Styleguidist) */
  listDisableVerticalPadding?: boolean;
  /** Adds 2rem paddingLeft */
  nested?: boolean;
  id?: string;
}

function ListItemLink(props: any) {
  return (
    <ListItem
      button={true}
      component='a'
      {...props}
    />
  );
}

export function AltinnAttachment({ attachments, listDisableVerticalPadding, nested, id }: IAltinnAttachmentProps) {
  const classes = useStyles();

  return (
    <>
      <List
        disablePadding={Boolean(listDisableVerticalPadding)}
        id={id}
        data-testid='attachment-list'
      >
        {attachments &&
          attachments.map((attachment, index) => (
            <ListItemLink
              className={cn(
                {
                  [classes.listItemPadding]: nested === true,
                  [classes.listItemPaddingNone]: nested !== true,
                },
                classes.a,
              )}
              href={attachment.url && makeUrlRelativeIfSameDomain(attachment.url)}
              key={index}
            >
              <ListItemIcon>
                <AltinnIcon
                  iconClass={attachment.iconClass}
                  iconColor='#000000'
                  iconSize='5rem'
                />
              </ListItemIcon>
              <ListItemText
                primary={
                  <>
                    <Typography
                      variant='body1'
                      className={cn(classes.inline, classes.primaryText)}
                    >
                      {attachment.name}
                    </Typography>
                    <Typography
                      variant='body1'
                      className={classes.inline}
                    >
                      &nbsp;(last ned)
                    </Typography>
                  </>
                }
                classes={{
                  root: cn(classes.listItemTextPadding),
                }}
              />
            </ListItemLink>
          ))}
      </List>
    </>
  );
}

export default AltinnAttachment;
