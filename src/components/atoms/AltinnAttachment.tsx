import React from 'react';

import { List, ListItem, ListItemIcon, ListItemText, makeStyles, Typography } from '@material-ui/core';
import cn from 'classnames';

import { useLanguage } from 'src/hooks/useLanguage';
import { FileExtensionIcon } from 'src/layout/FileUpload/FileUploadTable/AttachmentFileName';
import { getFileEnding } from 'src/utils/attachment';
import { makeUrlRelativeIfSameDomain } from 'src/utils/urls/urlHelper';
import type { IAttachment } from 'src/types/shared';

const useStyles = makeStyles(() => ({
  a: {
    margin: '4px 0',
    borderRadius: 'var(--interactive_components-border_radius-normal)',
    '&:hover': {
      borderBottom: '0px',
    },
    '&:focus-within': {
      borderBottom: '0px',
      backgroundColor: 'transparent',
      outline: 'var(--fds-focus-border-width) solid var(--fds-outer-focus-border-color)',
      outlineOffset: 'var(--fds-focus-border-width)',
      boxShadow: '0 0 0 var(--fds-focus-border-width) var(--fds-inner-focus-border-color)',
    },
    '&:active': {
      borderBottom: '0px',
    },
    '&:after': {
      display: 'none',
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
  icon: {
    fontSize: '3rem',
    color: 'var(--semantic-text-neutral-default)',
    margin: '-8px 0',
  },
}));

interface IAltinnAttachmentProps {
  /** Attachments array with objects. See code example. */
  attachments?: IAttachment[];
  /** Disables vertical padding (does not currently work in Styleguidist) */
  listDisableVerticalPadding?: boolean;
  /** Adds 1.25rem paddingLeft */
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
  const { selectedLanguage } = useLanguage();

  return (
    <>
      <List
        disablePadding={Boolean(listDisableVerticalPadding)}
        id={id}
        data-testid='attachment-list'
      >
        {attachments &&
          attachments
            .sort((a, b) => {
              if (!a.name || !b.name) {
                return 0;
              }
              return a.name.localeCompare(b.name, selectedLanguage);
            })
            .map((attachment, index) => (
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
                  <FileExtensionIcon
                    fileEnding={getFileEnding(attachment.name)}
                    className={classes.icon}
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
