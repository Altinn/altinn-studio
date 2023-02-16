import React from 'react';
import { isMobile } from 'react-device-detect';

import { createTheme, makeStyles } from '@material-ui/core';

import { AltinnPopoverComponent } from 'src/components/AltinnPopover';
import { getLanguageFromKey } from 'src/language/sharedLanguage';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import type { IAnchorOrigin } from 'src/components/AltinnPopover';
import type { ILanguage } from 'src/types/shared';

const theme = createTheme(AltinnAppTheme);

const useStyle = makeStyles({
  helpTextPopoverPaper: {
    backgroundColor: theme.altinnPalette.primary.yellowLight,
    height: 'auto',
    width: 'auto',
  },
});

const anchorOrigin: IAnchorOrigin = {
  horizontal: 'right',
  vertical: 'bottom',
};

const transformOrigin: IAnchorOrigin = {
  horizontal: 'left',
  vertical: 'bottom',
};

export interface IHelpTextPopoverProps {
  helpIconRef: React.RefObject<any>;
  openPopover: boolean;
  helpText: React.ReactNode;
  language: ILanguage;
  onClose: () => void;
}

export function HelpTextPopover({ helpIconRef, openPopover, helpText, language, onClose }: IHelpTextPopoverProps) {
  const classes = useStyle();

  return (
    <>
      {!!helpIconRef && (
        <AltinnPopoverComponent
          anchorOrigin={anchorOrigin}
          transformOrigin={transformOrigin}
          anchorEl={openPopover ? helpIconRef.current : null}
          handleClose={onClose}
          paperProps={{
            classes: {
              root: classes.helpTextPopoverPaper,
            },
          }}
          descriptionText={helpText}
          closeButton={isMobile} // tmp fix until material-ui fixes https://github.com/mui-org/material-ui/issues/19965
          closeButtonText={getLanguageFromKey('general.close', language)}
        />
      )}
    </>
  );
}
