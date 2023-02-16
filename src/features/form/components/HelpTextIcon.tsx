import React from 'react';

import { createTheme, makeStyles } from '@material-ui/core';

import { getLanguageFromKey } from 'src/language/sharedLanguage';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import type { ILanguage } from 'src/types/shared';

const theme = createTheme(AltinnAppTheme);

const useStyle = makeStyles({
  helpTextIcon: {
    fontSize: '1.875rem',
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

export function HelpTextIcon({
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
        aria-label={getLanguageFromKey('popover.popover_button_helptext', language)}
        aria-hidden={false}
      >
        <i className={`${classes.helpTextIcon} ${openPopover ? 'reg reg-help-filled' : 'reg reg-help-outline'}`} />
      </span>
    );
  }
  return null;
}
