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
import classes from './ItemFieldType.module.css';
import { StudioButton } from '@studio/components';

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
    <StudioButton onClick={handleClick} variant='tertiary' className={classes.referenceButton}>
      {name}
    </StudioButton>
  );
};

const ObjectKindLabel = ({ fieldNode }: { fieldNode: UiSchemaNode }) => {
  const kindName = useKindName(fieldNode.objectKind);
  return <>{kindName}</>;
};
