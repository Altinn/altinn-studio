import React from 'react';

import { useLanguage } from 'src/hooks/useLanguage';

export interface IRequiredIndicatorProps {
  required?: boolean;
  readOnly?: boolean;
}

export const RequiredIndicator = ({ required, readOnly }: IRequiredIndicatorProps) => {
  const { langAsString } = useLanguage();
  if (required && !readOnly) {
    return <span>{` ${langAsString('form_filler.required_label')}`}</span>;
  }
  return null;
};
