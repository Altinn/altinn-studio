import React from 'react';
import { extractNameFromPointer, isReference, type UiSchemaNode } from '@altinn/schema-model/index';
import { StudioReferenceButton } from '@studio/components';
import { useSavableSchemaModel } from '@altinn/schema-editor/hooks/useSavableSchemaModel';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';

export type ItemFieldsTypesProps = {
  fieldNode: UiSchemaNode;
  typeLabel?: string;
  kindLabel?: string;
};

export const ItemFieldsTypes = ({ fieldNode, typeLabel, kindLabel }: ItemFieldsTypesProps) => {
  const savableModel = useSavableSchemaModel();
  const { setSelectedTypePointer } = useSchemaEditorAppContext();

  if (typeLabel) return <>{typeLabel}</>;
  if (kindLabel) return <>{kindLabel}</>;
  if (isReference(fieldNode)) {
    const referredNode = savableModel.getReferredNode(fieldNode);
    const name = extractNameFromPointer(referredNode.schemaPointer);
    const handleClick = () => setSelectedTypePointer(fieldNode.reference);
    return <StudioReferenceButton name={name} onClick={handleClick} node={fieldNode} />;
  }
  return null;
};
