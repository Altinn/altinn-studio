import React from 'react';
import {
  extractNameFromPointer,
  type FieldType,
  isField,
  isReference,
  type ReferenceNode,
  type UiSchemaNode,
} from '@altinn/schema-model/index';
import { useSavableSchemaModel } from '../../../../../hooks/useSavableSchemaModel';
import { useSchemaEditorAppContext } from '../../../../../hooks/useSchemaEditorAppContext';
import { useTypeName } from '../../../hooks/useTypeName';
import { useKindName } from '../../../hooks/useKindName';
import { ObjectKind } from '@altinn/schema-model';
import { Link } from '@digdir/designsystemet-react';
import classes from './ItemFieldType.module.css';

export type ItemFieldTypeProps = {
  fieldNode: UiSchemaNode;
};

export const ItemFieldType = ({ fieldNode }: ItemFieldTypeProps) => {
  const typeName = useTypeName(isField(fieldNode) ? (fieldNode.fieldType as FieldType) : undefined);
  const typeLabel = isField(fieldNode) && typeName;

  const kindName = useKindName(fieldNode.objectKind);
  const notReferenceKind = fieldNode.objectKind !== ObjectKind.Reference;
  const kindLabel = notReferenceKind && kindName;

  if (typeLabel) return <>{typeLabel}</>;
  if (kindLabel) return <>{kindLabel}</>;
  if (isReference(fieldNode)) return <ReferenceLink fieldNode={fieldNode} />;
  return null;
};

const ReferenceLink = ({ fieldNode }: { fieldNode: UiSchemaNode }) => {
  const savableModel = useSavableSchemaModel();
  const { setSelectedTypePointer } = useSchemaEditorAppContext();
  const referredNode = savableModel.getReferredNode(fieldNode as ReferenceNode);
  const name = extractNameFromPointer(referredNode.schemaPointer);

  const handleClick = () => {
    isReference(fieldNode) && setSelectedTypePointer(fieldNode.reference);
  };

  return (
    <Link asChild onClick={handleClick}>
      <button className={classes.linkButton}>{name}</button>
    </Link>
  );
};
