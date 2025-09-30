import React from 'react';

import classNames from 'classnames';

import classes from 'src/components/form/MessageBanner.module.css';
import { Lang } from 'src/features/language/Lang';
import type { ValidLanguageKey } from 'src/features/language/useLanguage';

interface IMessageBannerProps {
  error?: boolean;
  messageKey: ValidLanguageKey;
}

export const MessageBanner = ({ error, messageKey }: IMessageBannerProps) => (
  <div
    className={classNames(classes.banner, error ? classes.error : classes.default)}
    data-testid='MessageBanner-container'
  >
    <span>
      <Lang id={messageKey} />
    </span>
  </div>
);
