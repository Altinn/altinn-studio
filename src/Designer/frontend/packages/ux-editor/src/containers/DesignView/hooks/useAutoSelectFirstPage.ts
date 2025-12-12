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
  const { selectedFormLayoutName, setSelectedFormLayoutName, setSelectedItem } = useAppContext();
  const hasInitializedRef = useRef<boolean>(false);
  const setSelectedFormLayoutNameRef = useRef(setSelectedFormLayoutName);
  const setSelectedItemRef = useRef(setSelectedItem);

  if (!hasInitializedRef.current && !pagesQueryPending && pagesModel) {
    const firstPageId = findFirstPage(pagesModel);
    if (firstPageId && selectedFormLayoutName !== firstPageId) {
      setSelectedFormLayoutNameRef.current(firstPageId);
      setSelectedItemRef.current({
        type: ItemType.Page,
        id: firstPageId,
      });
    }
    hasInitializedRef.current = true;
  }
};
