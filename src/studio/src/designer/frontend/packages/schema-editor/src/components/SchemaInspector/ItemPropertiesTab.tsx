import { ILanguage, UiSchemaItem } from '../../types';
import InlineObject from '../InlineObject';
import { ItemDataComponent } from '../ItemDataComponent';
import React from 'react';
import { getObjectKind } from '../../utils/ui-schema-utils';

interface ItemPropertiesTabProps {
  language: ILanguage;
  itemToDisplay?: UiSchemaItem;
  parentItem?: UiSchemaItem;
  checkIsNameInUse: (name: string) => boolean;
}

export const ItemPropertiesTab = ({
  language,
  itemToDisplay,
  parentItem,
  checkIsNameInUse,
}: ItemPropertiesTabProps) => {
  return itemToDisplay?.combinationItem && itemToDisplay?.$ref === undefined ? (
    <InlineObject item={itemToDisplay} language={language} />
  ) : (
    <ItemDataComponent
      selectedId={itemToDisplay?.path ?? ''}
      selectedItem={itemToDisplay ?? null}
      parentItem={parentItem ?? null}
      objectKind={getObjectKind(itemToDisplay)}
      language={language}
      checkIsNameInUse={checkIsNameInUse}
    />
  );
};
