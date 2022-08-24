import React from 'react';
import { ILanguage, UiSchemaItem } from '../../types';
import { InlineObject } from '../InlineObject';
import { ItemDataComponent } from '../ItemDataComponent';

interface ItemPropertiesTabProps {
  language: ILanguage;
  selectedItem: UiSchemaItem;
  checkIsNameInUse: (name: string) => boolean;
}

export const ItemPropertiesTab = ({
  language,
  selectedItem,
  checkIsNameInUse,
}: ItemPropertiesTabProps) => {
  return selectedItem.combinationItem && selectedItem.$ref === undefined ? (
    <InlineObject item={selectedItem} language={language} />
  ) : (
    <ItemDataComponent
      selectedItem={selectedItem}
      language={language}
      checkIsNameInUse={checkIsNameInUse}
    />
  );
};
