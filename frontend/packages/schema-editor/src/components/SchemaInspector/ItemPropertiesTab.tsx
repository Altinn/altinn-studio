import React from 'react';
import type { UiSchemaNode } from '@altinn/schema-model';
import { ObjectKind, ROOT_POINTER } from '@altinn/schema-model';
import { InlineObject } from './InlineObject';
import { ItemDataComponent } from './ItemDataComponent';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';

interface ItemPropertiesTabProps {
  selectedItem: UiSchemaNode;
}

export const ItemPropertiesTab = ({ selectedItem }: ItemPropertiesTabProps) => {
  const { schemaModel } = useSchemaEditorAppContext();
  if (
    schemaModel.isChildOfCombination(selectedItem.pointer) &&
    selectedItem.objectKind !== ObjectKind.Reference
  ) {
    return <InlineObject item={selectedItem} />;
  } else if (selectedItem.pointer === ROOT_POINTER) {
    return <>root</>;
  } else {
    return <ItemDataComponent key={selectedItem.pointer} schemaNode={selectedItem} />;
  }
};
