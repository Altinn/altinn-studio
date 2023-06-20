import React from 'react';

import { CircularProgress } from '@altinn/altinn-design-system';

import { useAppSelector } from 'src/hooks/useAppSelector';
import { useLanguage } from 'src/hooks/useLanguage';
import { selectLayoutOrder } from 'src/selectors/getLayoutOrder';

export const Progress = () => {
  const currentPageId = useAppSelector((state) => state.formLayout.uiConfig.currentView);
  const pageIds = useAppSelector(selectLayoutOrder);
  const { langAsString } = useLanguage();

  const currentPageIndex = pageIds?.findIndex((page) => page === currentPageId) || 0;
  const currentPageNum = currentPageIndex + 1;

  const numberOfPages = pageIds?.length || 0;
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
