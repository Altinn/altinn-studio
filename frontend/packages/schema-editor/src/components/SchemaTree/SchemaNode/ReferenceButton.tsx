import React from 'react';
import {
  extractNameFromPointer,
  isReference,
  SchemaModel,
} from '@altinn/schema-model';
import { renderIcon } from './renderIcon';
import { Button } from '@digdir/design-system-react';

export interface ReferenceButtonProps {
  schemaModel: SchemaModel;
  pointer: string;
}

export const ReferenceButton = ({ schemaModel, pointer }: ReferenceButtonProps) => {
  const node = schemaModel.getNode(pointer);
  if (!isReference(node)) return null;
  const referredNode = schemaModel.getReferredNode(node);
  const icon = renderIcon(schemaModel, referredNode.pointer);
  const name = extractNameFromPointer(referredNode.pointer);
  return (
    <Button icon={icon} size='small' variant='secondary'>
      {name}
    </Button>
  );
};
