import * as React from 'react';
import { createMuiTheme, makeStyles } from '@material-ui/core';
import { AltinnPopover } from 'altinn-shared/components';
import { getLanguageFromKey } from 'altinn-shared/utils';
import { AltinnAppTheme } from 'altinn-shared/theme';

const theme = createMuiTheme(AltinnAppTheme);

const useStyle = makeStyles({
  helpTextPopoverPaper: {
    backgroundColor: theme.altinnPalette.primary.yellowLight,
    height: 'auto',
    width: 'auto',
  },
  helpTextPopoverText: {
    position: 'relative',
    width: '100%',
  },
});

export interface IHelpTextPopoverProps {
  helpIconRef: React.RefObject<any>;
  openPopover: boolean;
  helpText: string;
  language: any;
  closePopover: () => void;
}

export default function HelpTextPopover(props: IHelpTextPopoverProps) {
  const classes = useStyle();
  const {
    helpIconRef,
    openPopover,
    helpText,
    language,
    closePopover,
  } = props;

  return (
    <>
    {!!helpIconRef &&
      <AltinnPopover
        ariaLabel={`${getLanguageFromKey('popover.popover_open', language)}.
                    ${helpText}`}
        anchorOrigin={{
          horizontal: 'right',
          vertical: 'top',
        }}
        transformOrigin={{
          horizontal: 'right',
          vertical: 'bottom',
        }}
        backgroundColor={theme.altinnPalette.primary.yellowLight.toString()}
        anchorEl={openPopover ? helpIconRef.current : null}
        handleClose={closePopover}
        paperProps={{
          classes: {
            root: classes.helpTextPopoverPaper,
          },
        }}
        descriptionText={helpText}
      />
    }
    </>
  )
}