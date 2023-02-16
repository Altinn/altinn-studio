import React from 'react';

import { CircularProgress } from '@altinn/altinn-design-system';

import { useAppSelector } from 'src/common/hooks/useAppSelector';
import { selectLayoutOrder } from 'src/selectors/getLayoutOrder';
import { getTextFromAppOrDefault } from 'src/utils/textResource';

export const Progress = () => {
  const currentPageId = useAppSelector((state) => state.formLayout.uiConfig.currentView);
  const pageIds = useAppSelector(selectLayoutOrder);
  const language = useAppSelector((state) => state.language.language);
  const textResources = useAppSelector((state) => state.textResources.resources);

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
      ariaLabel={
        (language &&
          getTextFromAppOrDefault(
            'general.progress',
            textResources,
            language,
            [currentPageNum.toString(), numberOfPages.toString()],
            true,
          )) ||
        undefined
      }
    />
  );
};
