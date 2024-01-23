import React from 'react';

import classes from './UnsupportedVersionMessage.module.css';
import { Alert, Heading, Paragraph } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';

export interface UnsupportedVersionMessageProps {
  version: string;
  closestSupportedVersion: string;
  category: 'too-old' | 'too-new';
}

const getBodyTextKeys = (category: 'too-old' | 'too-new') => {
  if (category === 'too-old') {
    return ['ux_editor.unsupported_version_message.too_old_1'];
  }

  return [
    'ux_editor.unsupported_version_message.too_new_1',
    'ux_editor.unsupported_version_message.too_new_2',
    'ux_editor.unsupported_version_message.too_new_3',
  ];
};

export function UnsupportedVersionMessage({
  version,
  closestSupportedVersion,
  category,
}: UnsupportedVersionMessageProps) {
  const { t } = useTranslation();

  return (
    <div className={classes.wrapper}>
      <Alert severity='info' className={classes.message}>
        <Heading level={2} size='small'>
          {t('ux_editor.unsupported_version_message_title', { version })}
        </Heading>
        {getBodyTextKeys(category).map((key) => {
          return (
            <Paragraph key={key} className={classes.bodyText}>
              {t(key, { version, closestSupportedVersion })}
            </Paragraph>
          );
        })}
        <br />
      </Alert>
    </div>
  );
}
