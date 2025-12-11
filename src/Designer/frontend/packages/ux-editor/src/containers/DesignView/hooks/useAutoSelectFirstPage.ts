import { useCallback, useRef } from 'react';
import type { PagesModel } from 'app-shared/types/api/dto/PagesModel';
import type { SelectedItem } from '@altinn/ux-editor/AppContext';
import { findFirstPage } from '../../../utils/pageUtils';
import { ItemType } from '../../../components/Properties/ItemType';

interface UseAutoSelectFirstPageParams {
  pagesModel: PagesModel | undefined;
  pagesQueryPending: boolean;
  selectedFormLayoutName: string | undefined;
  layoutSet: string;
  setSelectedFormLayoutName: (name: string | undefined) => void;
  setSelectedItem: (item: SelectedItem | null) => void;
}

export const useAutoSelectFirstPage = ({
  pagesModel,
  pagesQueryPending,
  selectedFormLayoutName,
  layoutSet,
  setSelectedFormLayoutName,
  setSelectedItem,
}: UseAutoSelectFirstPageParams): void => {
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

  if (!pagesQueryPending && pagesModel && !selectedFormLayoutName) {
    autoSelectFirstPage(pagesModel);
  }
};
