import React from 'react';
import { createTheme, makeStyles } from '@material-ui/core';

import type { ILanguage } from 'altinn-shared/types';

import { getLanguageFromKey } from 'altinn-shared/utils';
import { AltinnAppTheme } from 'altinn-shared/theme';

const theme = createTheme(AltinnAppTheme);

const useStyle = makeStyles({
  helpTextIcon: {
    fontSize: '3rem',
    color: theme.altinnPalette.primary.blueDarker,
    '&:hover': {
      color: theme.altinnPalette.primary.blueDark,
      cursor: 'pointer',
    },
  },
});

export interface IHelpTextIconProps {
  helpIconRef: React.RefObject<any>;
  openPopover: boolean;
  language: ILanguage;
  onPopoverClick: (event: any) => void;
  onPopoverKeypress: (event: any) => void;
}

export default function HelpTextIcon({
  helpIconRef,
  openPopover,
  language,
  onPopoverClick,
  onPopoverKeypress,
}: IHelpTextIconProps) {
  const classes = useStyle();

  if (helpIconRef) {
    return (
      <span
        tabIndex={0}
        onClick={onPopoverClick}
        onKeyPress={onPopoverKeypress}
        ref={helpIconRef}
        role='button'
        aria-label={getLanguageFromKey(
          'popover.popover_button_helptext',
          language,
        )}
        aria-hidden={false}
      >
        <i
          className={`${classes.helpTextIcon} ${
            openPopover ? 'reg reg-help-filled' : 'reg reg-help-outline'
          }`}
        />
      </span>
    );
  }
  return null;
}
