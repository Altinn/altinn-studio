import React from 'react';
import type { ReferenceNode } from '@altinn/schema-model';
import { extractNameFromPointer } from '@altinn/schema-model';
import { StudioButton } from '@studio/components-legacy';
import classes from './ReferenceButton.module.css';
import { useSavableSchemaModel } from '../../../hooks/useSavableSchemaModel';
import { useSchemaEditorAppContext } from '../../../hooks/useSchemaEditorAppContext';

export interface ReferenceButtonProps {
  node: ReferenceNode;
}

export const ReferenceButton = ({ node }: ReferenceButtonProps) => {
  const savableModel = useSavableSchemaModel();
  const { setSelectedTypePointer } = useSchemaEditorAppContext();

  const referredNode = savableModel.getReferredNode(node);
  const { reference } = node;
  const name = extractNameFromPointer(referredNode.schemaPointer);
  const handleClick = () => setSelectedTypePointer(reference);

  return (
    <StudioButton className={classes.root} color='second' onClick={handleClick} variant='secondary'>
      {name}
    </StudioButton>
  );
};
