import React from 'react';
import { ILanguage } from '../../types';
import { InlineObject } from './InlineObject';
import { ItemDataComponent } from './ItemDataComponent';
import { ObjectKind, UiSchemaNode } from '@altinn/schema-model';

interface ItemPropertiesTabProps {
  language: ILanguage;
  selectedItem: UiSchemaNode;
  checkIsNameInUse: (name: string) => boolean;
}

export const ItemPropertiesTab = ({
  language,
  selectedItem,
  checkIsNameInUse,
}: ItemPropertiesTabProps) => {
  return (
    <>
      {selectedItem.objectKind === ObjectKind.Combination ? (
        <InlineObject item={selectedItem} language={language} />
      ) : (
        <ItemDataComponent
          selectedItem={selectedItem}
          language={language}
          checkIsNameInUse={checkIsNameInUse}
        />
      )}
    </>
  );
};
