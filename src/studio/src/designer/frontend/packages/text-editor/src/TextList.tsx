import React from 'react';
import { type LanguageRowProps, TextRow } from './TextRow';

export interface TextListProps extends Omit<LanguageRowProps, 'textId'> {
  textIds: string[];
}

export const TextList = ({ textIds, ...restProps }: TextListProps) => {
  return (
    <div>
      {textIds.map((textId) => (
        <TextRow key={`${restProps.langCode}${textId}`} textId={textId} {...restProps} />
      ))}
    </div>
  );
};
