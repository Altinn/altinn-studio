import React from 'react';
import { createTheme, makeStyles } from '@material-ui/core';
import { isMobile } from 'react-device-detect';

import type { ILanguage } from 'altinn-shared/types';

import { AltinnPopover } from 'altinn-shared/components';
import { getLanguageFromKey } from 'altinn-shared/utils';
import { AltinnAppTheme } from 'altinn-shared/theme';

const theme = createTheme(AltinnAppTheme);

const useStyle = makeStyles({
  helpTextPopoverPaper: {
    backgroundColor: theme.altinnPalette.primary.yellowLight,
    height: 'auto',
    width: 'auto',
  },
});

const anchorOrigin = {
  horizontal: 'right',
  vertical: 'bottom',
};

const transformOrigin = {
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

export default function HelpTextPopover({
  helpIconRef,
  openPopover,
  helpText,
  language,
  onClose,
}: IHelpTextPopoverProps) {
  const classes = useStyle();

  return (
    <>
      {!!helpIconRef && (
        <AltinnPopover
          ariaLabel={`${getLanguageFromKey('popover.popover_open', language)}`}
          anchorOrigin={anchorOrigin}
          transformOrigin={transformOrigin}
          backgroundColor={theme.altinnPalette.primary.yellowLight.toString()}
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
