import * as React from 'react';
import HelpTextPopover from './HelpTextPopover';
import HelpTextIcon from './HelpTextIcon';
import { ILanguage } from 'altinn-shared/types';

export interface IHelpTextContainerProps {
  language: ILanguage;
  id: string;
  helpText: React.ReactNode;
}

export function HelpTextContainer(props: IHelpTextContainerProps) {
  const helpIconRef = React.useRef();
  const [openPopover, setOpenPopover] = React.useState<boolean>(false);

  const toggleClickPopover = (event: React.MouseEvent): void => {
    event.stopPropagation();
    event.preventDefault();
    setOpenPopover(!openPopover);
  };

  const toggleKeypressPopover = (event: React.KeyboardEvent): void => {
    if ((event.key === ' ' || event.key === 'Enter') && !openPopover) {
      setOpenPopover(true);
    }
  };

  const closePopover = () => {
    setOpenPopover(false);
  };

  return (
    <>
      <HelpTextIcon
        helpIconRef={helpIconRef}
        language={props.language}
        toggleClickPopover={toggleClickPopover}
        toggleKeypressPopover={toggleKeypressPopover}
        openPopover={openPopover}
        id={props.id}
        aria-haspopup={true}
        aria-expanded={openPopover}
      />

      <HelpTextPopover
        helpIconRef={helpIconRef}
        openPopover={openPopover}
        language={props.language}
        helpText={props.helpText}
        closePopover={closePopover}
        key={props.id}
        id={props.id}
      />
    </>
  );
}
