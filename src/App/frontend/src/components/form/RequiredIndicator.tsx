import React from 'react';

import { Lang } from 'src/features/language/Lang';

export interface IRequiredIndicatorProps {
  required?: boolean;
}

export const RequiredIndicator = ({ required }: IRequiredIndicatorProps) =>
  required && (
    <span>
      {' '}
      <Lang
        id='form_filler.required_label'
        parseHtmlAndMarkdown={false}
      />
    </span>
  );
