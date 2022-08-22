import React from 'react';
import { ILanguage, UiSchemaItem } from '../../types';
import { InlineObject } from '../InlineObject';
import { ItemDataComponent } from '../ItemDataComponent';

interface ItemPropertiesTabProps {
  language: ILanguage;
  itemToDisplay?: UiSchemaItem;
  checkIsNameInUse: (name: string) => boolean;
}

export const ItemPropertiesTab = ({
  language,
  itemToDisplay,
  checkIsNameInUse,
}: ItemPropertiesTabProps) => {
  return itemToDisplay?.combinationItem && itemToDisplay?.$ref === undefined ? (
    <InlineObject item={itemToDisplay} language={language} />
  ) : (
    <ItemDataComponent
      selectedItem={itemToDisplay ?? null}
      language={language}
      checkIsNameInUse={checkIsNameInUse}
    />
  );
};
