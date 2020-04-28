import * as React from 'react';
import { getLanguageFromKey } from 'altinn-shared/utils';

export interface INavBarProps {
  language: any;
  handleClose: (e: any) => void;
}


const NavBar = (props: INavBarProps) => {
  return (
    <div className='a-modal-navbar'>
      {/* Hide this button for the time being, ref. issue https://github.com/altinn/altinn-studio/issues/2500 */}
      {/* {props.step === ProcessSteps.FormFilling &&
        <button
          type='button'
          className='a-modal-back a-js-tabable-popover'
          aria-label={getLanguageFromKey('general.back', props.language)}
        >
          <span className='ai-stack'>
            <i className='ai ai-stack-1x ai-plain-circle-big' aria-hidden='true' />
            <i className='ai-stack-1x ai ai-back' aria-hidden='true' />
          </span>
          <span className='hidden-button-text'>
            {getLanguageFromKey('general.back', props.language)}
          </span>
        </button>
      } */}
      <button
        type='button'
        className='a-modal-close a-js-tabable-popover'
        aria-label={getLanguageFromKey('general.close', props.language)}
        onClick={props.handleClose}
      >
        <span className='ai-stack'>
          <i className='ai ai-stack-1x ai-plain-circle-big' aria-hidden='true' />
          <i className='ai-stack-1x ai ai-exit  a-modal-close-icon' aria-hidden='true' />
        </span>
        <span className='hidden-button-text'>
          {getLanguageFromKey('general.close', props.language)}
        </span>
      </button>
    </div>
  );
}

export default NavBar;