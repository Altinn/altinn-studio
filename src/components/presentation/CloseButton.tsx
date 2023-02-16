import React from 'react';

import { useAppSelector } from 'src/common/hooks/useAppSelector';
import { getLanguageFromKey } from 'src/language/sharedLanguage';

interface CloseButtonProps {
  handleClose: () => void;
}

export const CloseButton = ({ handleClose }: CloseButtonProps) => {
  const language = useAppSelector((state) => state.language.language || {});
  return (
    <button
      type='button'
      className='a-modal-close a-js-tabable-popover ml-1'
      aria-label={getLanguageFromKey('general.close_schema', language)}
      onClick={handleClose}
    >
      <span className='ai-stack'>
        <i
          style={{ marginTop: -1, marginLeft: -1 }}
          className='ai-stack-1x ai ai-exit a-modal-close-icon'
          aria-hidden='true'
        />
      </span>
      <span className='sr-only'>{getLanguageFromKey('general.close_schema', language)}</span>
    </button>
  );
};
