import * as React from 'react';
import { getLanguageFromKey } from 'altinn-shared/utils';
import { createMuiTheme, makeStyles } from '@material-ui/core';
import { AltinnAppTheme } from 'altinn-shared/theme';

const theme = createMuiTheme(AltinnAppTheme);

const useStyle = makeStyles({
  helpTextIcon: {
    width: '44px',
    height: '44px',
    paddingTop: '2rem',
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
        onKeyUp={props.toggleKeypressPopover}
        ref={props.helpIconRef}
        role='button'
        aria-label={getLanguageFromKey('popover.popover_button_helptext', props.language)}
        aria-hidden={false}
      >
        <i
          className={`${classes.helpTextIcon} ${props.openPopover ? 'ai ai-circle-minus' : 'ai ai-circle-plus'}`}
        />
      </span>
    );
  }
  return null;
}
