import * as React from 'react';
import { getLanguageFromKey } from 'altinn-shared/utils';
import { ILanguage } from 'altinn-shared/types';

export interface INavBarProps {
  language: ILanguage;
  handleClose: (e: any) => void;
  handleBack: (e: any) => void;
  showBackArrow?: boolean;
  hideCloseButton?: boolean;
}

const NavBar = (props: INavBarProps) => {
  return (
    <nav className='a-modal-navbar' aria-label={getLanguageFromKey('navigation.main', props.language)}>
      {props.showBackArrow &&
        <button
          type='button'
          className='a-modal-back a-js-tabable-popover'
          aria-label={getLanguageFromKey('general.back', props.language)}
          onClick={props.handleBack}
        >
          <span className='ai-stack'>
            <i className='ai-stack-1x ai ai-back' aria-hidden='true' />
          </span>
          <span className='hidden-button-text'>
            {getLanguageFromKey('general.back', props.language)}
          </span>
        </button>
      }
      {!props.hideCloseButton &&
        <button
          type='button'
          className='a-modal-close a-js-tabable-popover'
          aria-label={getLanguageFromKey('general.close_schema', props.language)}
          onClick={props.handleClose}
        >
          <span className='ai-stack'>
            <i className='ai-stack-1x ai ai-exit  a-modal-close-icon' aria-hidden='true' />
          </span>
          <span className='hidden-button-text'>
            {getLanguageFromKey('general.close_schema', props.language)}
          </span>
        </button>
      }
    </nav>
  );
};

export default NavBar;
