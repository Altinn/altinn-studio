import React from 'react';
import {
  extractNameFromPointer,
  isField,
  isReference,
  type UiSchemaNode,
} from '@altinn/schema-model/index';
import { useSavableSchemaModel } from '@altinn/schema-editor/hooks/useSavableSchemaModel';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';
import { useTypeNames } from '../../../hooks/useTypeNames';
import { useKindNames } from '../../../hooks/useKindNames';
import { ObjectKind } from '@altinn/schema-model';
import { Link } from '@digdir/designsystemet-react';
import classes from './ItemFieldType.module.css';

export type ItemFieldTypeProps = {
  fieldNode: UiSchemaNode;
};

export const ItemFieldType = ({ fieldNode }: ItemFieldTypeProps) => {
  const savableModel = useSavableSchemaModel();
  const { setSelectedTypePointer } = useSchemaEditorAppContext();

  const typeNames = useTypeNames();
  const typeLabel = isField(fieldNode) && typeNames[fieldNode.fieldType];

  const kindNames = useKindNames();
  const notReferenceKind = fieldNode.objectKind !== ObjectKind.Reference;
  const kindLabel = notReferenceKind && kindNames[fieldNode.objectKind];

  if (typeLabel) return <>{typeLabel}</>;
  if (kindLabel) return <>{kindLabel}</>;
  if (isReference(fieldNode)) {
    const referredNode = savableModel.getReferredNode(fieldNode);
    const name = extractNameFromPointer(referredNode.schemaPointer);
    const handleClick = () => setSelectedTypePointer(fieldNode.reference);
    return (
      <Link asChild onClick={handleClick}>
        <button className={classes.linkButton}>{name}</button>
      </Link>
    );
  }
  return null;
};
