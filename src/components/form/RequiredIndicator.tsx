import React from 'react';

import { Lang } from 'src/features/language/Lang';

export interface IRequiredIndicatorProps {
  required?: boolean;
  readOnly?: boolean;
}

export const RequiredIndicator = ({ required, readOnly }: IRequiredIndicatorProps) =>
  required &&
  !readOnly && (
    <span>
      {' '}
      <Lang
        id='form_filler.required_label'
        parseHtmlAndMarkdown={false}
      />
    </span>
  );
