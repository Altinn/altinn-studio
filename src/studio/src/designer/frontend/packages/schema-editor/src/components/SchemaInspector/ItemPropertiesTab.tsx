import React from 'react';
import type { ILanguage } from '../../types';
import type { UiSchemaNode } from '@altinn/schema-model';
import { ObjectKind, ROOT_POINTER } from '@altinn/schema-model';
import { InlineObject } from './InlineObject';
import { ItemDataComponent } from './ItemDataComponent';

interface ItemPropertiesTabProps {
  language: ILanguage;
  selectedItem: UiSchemaNode;
}

export const ItemPropertiesTab = ({ language, selectedItem }: ItemPropertiesTabProps) => {
  if (selectedItem.isCombinationItem && selectedItem.objectKind !== ObjectKind.Reference) {
    return <InlineObject item={selectedItem} language={language} />;
  } else if (selectedItem.pointer === ROOT_POINTER) {
    return <>root</>;
  } else {
    return <ItemDataComponent selectedItem={selectedItem} language={language} />;
  }
};
