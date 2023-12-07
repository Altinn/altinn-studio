import React from 'react';

import { CircularProgress } from '@altinn/altinn-design-system';

import { useLanguage } from 'src/features/language/useLanguage';
import { useNavigatePage } from 'src/hooks/useNavigatePage';

export const Progress = () => {
  const { currentPageId, order } = useNavigatePage();
  const { langAsString } = useLanguage();

  const currentPageIndex = order?.findIndex((page) => page === currentPageId) || 0;
  const currentPageNum = currentPageIndex + 1;

  const numberOfPages = order?.length || 0;
  const labelText = `${currentPageNum}/${numberOfPages}`;
  const value = numberOfPages ? (currentPageNum / numberOfPages) * 100 : 0;

  return (
    <CircularProgress
      value={value}
      id={'progress'}
      label={labelText}
      ariaLabel={langAsString('general.progress', [currentPageNum, numberOfPages])}
    />
  );
};
