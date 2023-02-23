import React from 'react';

import { makeStyles } from '@material-ui/core';

import { HelpTextIcon } from 'src/features/form/components/HelpTextIcon';
import { HelpTextPopover } from 'src/features/form/components/HelpTextPopover';
import type { ILanguage } from 'src/types/shared';

export interface IHelpTextContainerProps {
  language: ILanguage;
  helpText: React.ReactNode;
}

const useStyles = makeStyles({
  hiddenInPdf: {
    '@media print': {
      display: 'none',
    },
  },
});

export function HelpTextContainer({ language, helpText }: IHelpTextContainerProps) {
  const helpIconRef = React.useRef();
  const [openPopover, setOpenPopover] = React.useState<boolean>(false);
  const classes = useStyles();

  const handlePopoverClick = (event: React.MouseEvent): void => {
    event.stopPropagation();
    event.preventDefault();
    setOpenPopover(!openPopover);
  };

  const handlePopoverKeypress = (event: React.KeyboardEvent): void => {
    if (event.key === ' ' || event.key === 'Enter') {
      setOpenPopover(!openPopover);
    }
  };

  const handlePopoverClose = () => {
    setOpenPopover(false);
  };

  function onBlur(event: React.FocusEvent<HTMLInputElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      handlePopoverClose();
    }
  }

  return (
    <span
      tabIndex={-1}
      onBlur={onBlur}
      className={classes.hiddenInPdf}
    >
      <HelpTextIcon
        helpIconRef={helpIconRef}
        language={language}
        onPopoverClick={handlePopoverClick}
        onPopoverKeypress={handlePopoverKeypress}
        openPopover={openPopover}
        aria-haspopup={true}
        aria-expanded={openPopover}
      />

      <HelpTextPopover
        helpIconRef={helpIconRef}
        openPopover={openPopover}
        language={language}
        helpText={helpText}
        onClose={handlePopoverClose}
      />
    </span>
  );
}
