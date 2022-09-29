import React from 'react';
import { ILanguage } from '../../types';
import { InlineObject } from './InlineObject';
import { ItemDataComponent } from './ItemDataComponent';
import { ObjectKind, ROOT_POINTER, UiSchemaNode } from '@altinn/schema-model';

interface ItemPropertiesTabProps {
  language: ILanguage;
  selectedItem: UiSchemaNode;
  checkIsNameInUse: (name: string) => boolean;
}

export const ItemPropertiesTab = ({ language, selectedItem, checkIsNameInUse }: ItemPropertiesTabProps) => {
  return (
    <>
      {selectedItem.isCombinationItem && selectedItem.objectKind !== ObjectKind.Reference ? (
        <InlineObject item={selectedItem} language={language} />
      ) : selectedItem.pointer === ROOT_POINTER ? (
        <>root</>
      ) : (
        <ItemDataComponent selectedItem={selectedItem} language={language} checkIsNameInUse={checkIsNameInUse} />
      )}
    </>
  );
};
