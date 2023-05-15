import React from 'react';

import classNames from 'classnames';

import classes from 'src/components/form/MessageBanner.module.css';
import { getLanguageFromKey } from 'src/language/sharedLanguage';
import type { ValidLanguageKey } from 'src/hooks/useLanguage';
import type { ILanguage } from 'src/types/shared';

interface IMessageBannerProps {
  language: ILanguage;
  error?: boolean;
  messageKey: ValidLanguageKey;
}

export const MessageBanner = ({ language, error, messageKey }: IMessageBannerProps) => (
  <div
    className={classNames(classes.banner, error ? classes.error : classes.default)}
    data-testid='MessageBanner-container'
  >
    <span>{getLanguageFromKey(messageKey, language)}</span>
  </div>
);
