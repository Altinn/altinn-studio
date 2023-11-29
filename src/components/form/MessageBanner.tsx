import React from 'react';

import classNames from 'classnames';

import classes from 'src/components/form/MessageBanner.module.css';
import { useLanguage } from 'src/features/language/useLanguage';
import type { ValidLanguageKey } from 'src/features/language/useLanguage';

interface IMessageBannerProps {
  error?: boolean;
  messageKey: ValidLanguageKey;
}

export const MessageBanner = ({ error, messageKey }: IMessageBannerProps) => {
  const { lang } = useLanguage();

  return (
    <div
      className={classNames(classes.banner, error ? classes.error : classes.default)}
      data-testid='MessageBanner-container'
    >
      <span>{lang(messageKey)}</span>
    </div>
  );
};
