import React, { ReactElement, ReactNode } from 'react';
import {
  extractNameFromPointer,
  isReference,
  SchemaModel,
} from '@altinn/schema-model';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';
import { renderSchemaNodeList } from '../renderSchemaNodeList';
import { renderIcon } from './renderIcon';
import { ActionButtons } from '@altinn/schema-editor/components/SchemaTree/SchemaNode/ActionButtons';
import classes from './SchemaNode.module.css';
import { ReferenceButton } from '@altinn/schema-editor/components/SchemaTree/SchemaNode/ReferenceButton';

export interface SchemaNodeProps {
  pointer: string;
  schema: SchemaModel;
}

export const SchemaNode = ({ pointer, schema }: SchemaNodeProps): ReactElement => {
  return (
    <DragAndDropTree.Item
      icon={renderIcon(schema, pointer)}
      label={extractNameFromPointer(pointer)}
      labelWrapper={labelWrapper(schema, pointer)}
      nodeId={pointer}
      emptyMessage={'asdasdasd'}
    >
      {renderSchemaNodeList(schema, pointer)}
    </DragAndDropTree.Item>
  );
};

const labelWrapper = (schemaModel: SchemaModel, pointer: string) => (label: ReactNode) => {
  const node = schemaModel.getNode(pointer);
  return (
    <div className={classes.schemaNodeLabel}>
      {label}
      {isReference(node) && <ReferenceButton schemaModel={schemaModel} pointer={pointer} />}
      <ActionButtons pointer={pointer} schemaModel={schemaModel} />
    </div>
  );
};
