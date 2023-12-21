import React from 'react';
import { extractNameFromPointer, ReferenceNode } from '@altinn/schema-model';
import { Button } from '@digdir/design-system-react';
import { navigateToType } from '../../../features/editor/schemaEditorSlice';
import { useDispatch } from 'react-redux';
import classes from './ReferenceButton.module.css';
import { useSavableSchemaModel } from '../../../hooks/useSavableSchemaModel';

export interface ReferenceButtonProps {
  node: ReferenceNode;
}

export const ReferenceButton = ({ node }: ReferenceButtonProps) => {
  const savableModel = useSavableSchemaModel();
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
