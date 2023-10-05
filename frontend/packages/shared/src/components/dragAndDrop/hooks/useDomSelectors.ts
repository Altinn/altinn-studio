import { DragAndDropRootContext } from 'app-shared/components/dragAndDrop/DragAndDropProvider';
import { useContext } from 'react';
import {
  domItemClass,
  domItemId,
  domListClass,
  domListId,
} from 'app-shared/components/dragAndDrop/utils/domUtils';

interface Attributes {
  id: string;
  className: string;
}

interface DomSelectors {
  baseId: string;
  item: Attributes;
  list: Attributes;
}

export function useDomSelectors(itemId: string): DomSelectors {
  const context = useContext(DragAndDropRootContext);
  if (!context) {
    throw new Error('useDomSelectors must be used within a DragAndDropRootContext provider.');
  }
  return {
    baseId: context.uniqueDomId,
    item: {
      id: domItemId(context.uniqueDomId, itemId),
      className: domItemClass(context.uniqueDomId),
    },
    list: {
      id: domListId(context.uniqueDomId, itemId),
      className: domListClass(context.uniqueDomId),
    },
  };
}
