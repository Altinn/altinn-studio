import React from 'react';

import type { ILanguage } from 'altinn-shared/types';

import HelpTextPopover from './HelpTextPopover';
import HelpTextIcon from './HelpTextIcon';

export interface IHelpTextContainerProps {
  language: ILanguage;
  helpText: React.ReactNode;
}

export function HelpTextContainer({
  language,
  helpText,
}: IHelpTextContainerProps) {
  const helpIconRef = React.useRef();
  const [openPopover, setOpenPopover] = React.useState<boolean>(false);

  const handlePopoverClick = (event: React.MouseEvent): void => {
    event.stopPropagation();
    event.preventDefault();
    setOpenPopover(!openPopover);
  };

  const handlePopoverKeypress = (event: React.KeyboardEvent): void => {
    if ((event.key === ' ' || event.key === 'Enter') && !openPopover) {
      setOpenPopover(true);
    }
  };

  const handlePopoverClose = () => {
    setOpenPopover(false);
  };

  return (
    <>
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
    </>
  );
}
