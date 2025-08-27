import React from 'react';
import {
  extractNameFromPointer,
  type FieldNode,
  isField,
  isReference,
  type ReferenceNode,
  type UiSchemaNode,
} from '@altinn/schema-model/index';
import { useSchemaEditorAppContext } from '../../../../../hooks/useSchemaEditorAppContext';
import { useTypeName } from './hooks/useTypeName';
import { useKindName } from './hooks/useKindName';
import { Link } from '@digdir/designsystemet-react';
import classes from './ItemFieldType.module.css';

export type ItemFieldTypeProps = {
  fieldNode: UiSchemaNode;
};

export const ItemFieldType = ({ fieldNode }: ItemFieldTypeProps) => {
  if (isField(fieldNode)) return <FieldTypeLabel fieldNode={fieldNode} />;
  if (isReference(fieldNode)) return <ReferenceLink fieldNode={fieldNode} />;
  return <ObjectKindLabel fieldNode={fieldNode} />;
};

const FieldTypeLabel = ({ fieldNode }: { fieldNode: FieldNode }) => {
  const typeName = useTypeName(fieldNode.fieldType);
  return <>{typeName}</>;
};

const ReferenceLink = ({ fieldNode }: { fieldNode: ReferenceNode }) => {
  const { setSelectedTypePointer } = useSchemaEditorAppContext();
  const name = extractNameFromPointer(fieldNode.reference);

  const handleClick = (): void => setSelectedTypePointer(fieldNode.reference);

  return (
    <Link asChild onClick={handleClick}>
      <button className={classes.linkButton}>{name}</button>
    </Link>
  );
};

const ObjectKindLabel = ({ fieldNode }: { fieldNode: UiSchemaNode }) => {
  const kindName = useKindName(fieldNode.objectKind);
  return <>{kindName}</>;
};
