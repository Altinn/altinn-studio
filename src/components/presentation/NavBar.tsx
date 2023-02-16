import React from 'react';

import { Box, useTheme } from '@material-ui/core';

import { useAppSelector } from 'src/common/hooks/useAppSelector';
import { CloseButton } from 'src/components/presentation/CloseButton';
import { LanguageSelector } from 'src/components/presentation/LanguageSelector';
import { getLanguageFromKey } from 'src/language/sharedLanguage';

export interface INavBarProps {
  handleClose: () => void;
  handleBack: (e: any) => void;
  showBackArrow?: boolean;
}

export const NavBar = (props: INavBarProps) => {
  const hideCloseButton = useAppSelector((state) => state.formLayout.uiConfig.hideCloseButton);
  const language = useAppSelector((state) => state.language.language || {});
  const theme = useTheme();

  const showLanguageSelector = useAppSelector((state) => state.formLayout.uiConfig.showLanguageSelector);
  return (
    <Box
      component={'nav'}
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
              <i
                style={{ marginTop: -2, marginLeft: -1 }}
                className={`ai-stack-1x ai ${theme.direction === 'rtl' ? 'ai-arrowright' : 'ai-back'}`}
                aria-hidden='true'
              />
            </span>
            <span className='sr-only'>{getLanguageFromKey('general.back', language)}</span>
          </button>
        )}
      </div>

      <Box
        display='flex'
        alignItems={'end'}
      >
        {showLanguageSelector && <LanguageSelector />}

        {!hideCloseButton && <CloseButton handleClose={props.handleClose} />}
      </Box>
    </Box>
  );
};
