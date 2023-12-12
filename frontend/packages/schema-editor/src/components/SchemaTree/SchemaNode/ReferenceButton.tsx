import React from 'react';
import {
  extractNameFromPointer,
  ReferenceNode,
} from '@altinn/schema-model';
import { Button } from '@digdir/design-system-react';
import { SavableSchemaModel } from '@altinn/schema-editor/classes/SavableSchemaModel';
import { navigateToType } from '@altinn/schema-editor/features/editor/schemaEditorSlice';
import { useDispatch } from 'react-redux';
import classes from './ReferenceButton.module.css';

export interface ReferenceButtonProps {
  savableModel: SavableSchemaModel;
  node: ReferenceNode;
}

export const ReferenceButton = ({ savableModel, node }: ReferenceButtonProps) => {
  const dispatch = useDispatch();

  const referredNode = savableModel.getReferredNode(node);
  const { reference } = node;
  const name = extractNameFromPointer(referredNode.pointer);
  const handleClick = () => dispatch(navigateToType({ pointer: reference }));

  return (
    <Button
      className={classes.root}
      color='second'
      onClick={handleClick}
      size='small'
      variant='secondary'
    >
      {name}
    </Button>
  );
};
