import { useEffect, useRef } from 'react';
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
  const initialisedForPagesModelRef = useRef<PagesModel | undefined>(undefined);

  useEffect(() => {
    if (pagesQueryPending || !pagesModel) return;
    if (initialisedForPagesModelRef.current === pagesModel) return;

    const firstPageId = findFirstPage(pagesModel);
    if (firstPageId && selectedFormLayoutName !== firstPageId) {
      setSelectedFormLayoutName(firstPageId);
      setSelectedItem({ type: ItemType.Page, id: firstPageId });
    }
    initialisedForPagesModelRef.current = pagesModel;
  }, [
    pagesModel,
    pagesQueryPending,
    selectedFormLayoutName,
    setSelectedFormLayoutName,
    setSelectedItem,
  ]);
};
