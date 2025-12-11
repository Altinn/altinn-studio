import { useCallback, useRef } from 'react';
import type { PagesModel } from 'app-shared/types/api/dto/PagesModel';
import { useAppContext } from '../../../hooks';
import { findFirstPage } from '../../../utils/pageUtils';
import { ItemType } from '../../../components/Properties/ItemType';

interface UseAutoSelectFirstPageParams {
  pagesModel: PagesModel | undefined;
  pagesQueryPending: boolean;
  layoutSet: string;
}

export const useAutoSelectFirstPage = ({
  pagesModel,
  pagesQueryPending,
  layoutSet,
}: UseAutoSelectFirstPageParams): void => {
  const { setSelectedFormLayoutName, setSelectedItem } = useAppContext();
  const hasInitializedRef = useRef<string | false>(false);
  const setSelectedFormLayoutNameRef = useRef(setSelectedFormLayoutName);
  const setSelectedItemRef = useRef(setSelectedItem);
  setSelectedFormLayoutNameRef.current = setSelectedFormLayoutName;
  setSelectedItemRef.current = setSelectedItem;

  const autoSelectFirstPage = useCallback(
    (pageModel: PagesModel) => {
      if (hasInitializedRef.current !== layoutSet) {
        const firstPageId = findFirstPage(pageModel);
        if (firstPageId) {
          setSelectedFormLayoutNameRef.current(firstPageId);
          setSelectedItemRef.current({
            type: ItemType.Page,
            id: firstPageId,
          });
          hasInitializedRef.current = layoutSet;
        }
      }
    },
    [layoutSet],
  );

  if (!hasInitializedRef.current && !pagesQueryPending) {
    autoSelectFirstPage(pagesModel);
  }
};
