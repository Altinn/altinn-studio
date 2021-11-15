import * as React from 'react';
import { createTheme, makeStyles } from '@material-ui/core';
import { AltinnPopover } from 'altinn-shared/components';
import { getLanguageFromKey } from 'altinn-shared/utils';
import { AltinnAppTheme } from 'altinn-shared/theme';
import { isMobile } from 'react-device-detect';

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
  helpText: string;
  language: any;
  id: string;
  closePopover: () => void;
}

export default function HelpTextPopover(props: IHelpTextPopoverProps) {
  const classes = useStyle();
  const { helpIconRef, openPopover, helpText, language, closePopover } = props;

  return (
    <>
      {!!helpIconRef && (
        <AltinnPopover
          ariaLabel={`${getLanguageFromKey('popover.popover_open', language)}`}
          anchorOrigin={anchorOrigin}
          transformOrigin={transformOrigin}
          backgroundColor={theme.altinnPalette.primary.yellowLight.toString()}
          anchorEl={openPopover ? helpIconRef.current : null}
          handleClose={closePopover}
          // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
          paperProps={{
            classes: {
              root: classes.helpTextPopoverPaper,
            },
          }}
          descriptionText={helpText}
          closeButton={isMobile} // tmp fix until material-ui fixes https://github.com/mui-org/material-ui/issues/19965
          closeButtonText={getLanguageFromKey('general.close', props.language)}
        />
      )}
    </>
  );
}
