import { useRef } from 'react';
import type { PagesModel } from 'app-shared/types/api/dto/PagesModel';
import { useAppContext } from '../../../hooks';
import { findFirstPage } from '../../../utils/pageUtils';
import { ItemType } from '../../../components/Properties/ItemType';

interface UseAutoSelectFirstPageParams {
  pagesModel: PagesModel | undefined;
  pagesQueryPending: boolean;
}

export const useAutoSelectFirstPage = ({
  pagesModel,
  pagesQueryPending,
}: UseAutoSelectFirstPageParams): void => {
  const { setSelectedFormLayoutName, setSelectedItem } = useAppContext();
  const hasInitializedRef = useRef<boolean>(false);
  const setSelectedFormLayoutNameRef = useRef(setSelectedFormLayoutName);
  const setSelectedItemRef = useRef(setSelectedItem);

  const autoSelectFirstPage = (pageModel: PagesModel) => {
    if (!hasInitializedRef.current) {
      const firstPageId = findFirstPage(pageModel);
      if (firstPageId) {
        setSelectedFormLayoutNameRef.current(firstPageId);
        setSelectedItemRef.current({
          type: ItemType.Page,
          id: firstPageId,
        });
        hasInitializedRef.current = true;
      }
    }
  };

  if (!hasInitializedRef.current && !pagesQueryPending) {
    autoSelectFirstPage(pagesModel);
  }
};
