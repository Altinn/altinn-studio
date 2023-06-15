import React from 'react';

import { List, ListItem, ListItemIcon, ListItemText, makeStyles, Typography } from '@material-ui/core';
import cn from 'classnames';

import { AltinnIcon } from 'src/components/AltinnIcon';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { appLanguageStateSelector } from 'src/selectors/appLanguageStateSelector';
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
  const currentLanguage = useAppSelector(appLanguageStateSelector);

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
              return a.name.localeCompare(b.name, currentLanguage);
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
                  <AltinnIcon
                    iconClass={attachment.iconClass}
                    iconColor='#000000'
                    iconSize='3.125rem'
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
