import React from 'react';
import type { IInternalLayout } from '../../types/global';
import { getDuplicatedIds } from '../../utils/formLayoutUtils';

interface FormLayoutWarningProps {
  layout: IInternalLayout;
}

export const FormLayoutWarning = ({ layout }: FormLayoutWarningProps) => {
  const duplicatedIds = getDuplicatedIds(layout);
  return (
    <div>
      {duplicatedIds.map((id) => (
        <div key={id}>{id}</div>
      ))}
    </div>
  );
};
