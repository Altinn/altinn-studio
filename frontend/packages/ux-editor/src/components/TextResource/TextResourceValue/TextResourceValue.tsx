import React from 'react';
import { useText, useTextResourcesSelector } from '../../../hooks';
import { textResourceByLanguageAndIdSelector } from '../../../selectors/textResourceSelectors';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import classes from './TextResourceValue.module.css';

export type TextResourceValueProps = {
  id: string;
};

export const TextResourceValue = ({ id }: TextResourceValueProps) => {
  const t = useText();
  const selector = textResourceByLanguageAndIdSelector(DEFAULT_LANGUAGE, id);
  const textResource = useTextResourcesSelector(selector);

  return textResource?.value ? (
    textResource.value
  ) : (
    <span className={classes.emptyString}>{t('general.empty_string')}</span>
  );
};
