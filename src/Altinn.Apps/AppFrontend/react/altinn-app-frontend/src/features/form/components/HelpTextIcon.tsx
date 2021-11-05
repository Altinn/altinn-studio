import * as React from 'react';
import { getLanguageFromKey } from 'altinn-shared/utils';
import { createTheme, makeStyles } from '@material-ui/core';
import { AltinnAppTheme } from 'altinn-shared/theme';

const theme = createTheme(AltinnAppTheme);

const useStyle = makeStyles({
  helpTextIcon: {
    fontSize: '3rem',
    color: theme.altinnPalette.primary.blue,
    '&:hover': {
      color: theme.altinnPalette.primary.blueDarker,
    },
  },
});

export interface IHelpTextIconProps {
  helpIconRef: React.RefObject<any>;
  openPopover: boolean;
  language: any;
  id: string;
  toggleClickPopover: (event: any) => void;
  toggleKeypressPopover: (event: any) => void;
}

export default function HelpTextIcon(props: IHelpTextIconProps) {
  const classes = useStyle();

  if (props.helpIconRef) {
    return (
      <span
        tabIndex={0}
        onClick={props.toggleClickPopover}
        onKeyPress={props.toggleKeypressPopover}
        ref={props.helpIconRef}
        role='button'
        aria-label={getLanguageFromKey('popover.popover_button_helptext', props.language)}
        aria-hidden={false}
      >
        <i
          className={`${classes.helpTextIcon} ${props.openPopover ? 'ai ai-circle-minus' : 'ai ai-help-popicon'}`}
        />
      </span>
    );
  }
  return null;
}
