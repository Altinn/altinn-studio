import * as React from 'react';
import { getLanguageFromKey } from 'altinn-shared/utils';
import { Box } from '@material-ui/core';
import { useAppSelector } from 'src/common/hooks';
import { CloseButton } from 'src/components/presentation/CloseButton';
import { LanguageSelector } from 'src/components/presentation/LanguageSelector';

export interface INavBarProps {
  handleClose: () => void;
  handleBack: (e: any) => void;
  showBackArrow?: boolean;
}

const NavBar = (props: INavBarProps) => {
  const hideCloseButton = useAppSelector(state => state.formLayout.uiConfig.hideCloseButton);
  const language = useAppSelector(state => state.language.language || {});

  const showLanguageSelector = useAppSelector(
    (state) => state.formLayout.uiConfig.showLanguageSelector,
  );
  return (
    <Box
      component={"nav"}
      aria-label={getLanguageFromKey('navigation.main', language)}
      width={'100%'}
      display='flex'
      justifyContent={'space-between'}
      alignItems={'flex-end'}
      className='mt-3'
    >
      <div>
        {props.showBackArrow && (
          <button
            data-testid='altinn-back-button'
            type='button'
            className='a-modal-back a-js-tabable-popover'
            aria-label={getLanguageFromKey('general.back', language)}
            onClick={props.handleBack}
          >
            <span className='ai-stack'>
              <i className='ai-stack-1x ai ai-back' aria-hidden='true' />
            </span>
            <span className='sr-only'>
              {getLanguageFromKey('general.back', language)}
            </span>
          </button>
        )}
      </div>

      <Box display='flex' alignItems={'end'}>
        {showLanguageSelector && (
          <LanguageSelector/>
        )}

        {!hideCloseButton && <CloseButton handleClose={props.handleClose}/>}
      </Box>
    </Box>
  );
};

export default NavBar;
