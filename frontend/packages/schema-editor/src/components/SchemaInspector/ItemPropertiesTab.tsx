import React from 'react';
import type { UiSchemaNode } from '@altinn/schema-model';
import { ObjectKind, ROOT_POINTER } from '@altinn/schema-model';
import { InlineObject } from './InlineObject';
import { ItemDataComponent } from './ItemDataComponent';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';
import { Alert } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';

interface ItemPropertiesTabProps {
  selectedItem: UiSchemaNode;
}

export const ItemPropertiesTab = ({ selectedItem }: ItemPropertiesTabProps) => {
  const { t } = useTranslation();

  const { schemaModel } = useSchemaEditorAppContext();
  if (
    schemaModel.isChildOfCombination(selectedItem.pointer) &&
    selectedItem.objectKind !== ObjectKind.Reference
  ) {
    return <InlineObject item={selectedItem} />;
  } else if (selectedItem.pointer === ROOT_POINTER) {
    return <Alert severity='info'>{t('app_data_modelling.properties_information')}</Alert>;
  } else {
    return <ItemDataComponent key={selectedItem.pointer} schemaNode={selectedItem} />;
  }
};
