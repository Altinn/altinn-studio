import type { ITextResource } from 'app-shared/types/global';
import { useText } from '../../../../hooks';
import classes from './TextResourceOption.module.css';
import cn from 'classnames';
import React from 'react';

export interface TextResourceOptionProps {
  textResource: ITextResource;
}

export const TextResourceOption = ({ textResource }: TextResourceOptionProps) => {
  const t = useText();
  return (
    <span className={classes.textOption}>
      <span className={classes.textOptionId}>{textResource.id}</span>
      <span className={cn(classes.textOptionValue, !textResource.value && classes.empty)}>
        {textResource.value || t('ux_editor.no_text')}
      </span>
    </span>
  );
};
