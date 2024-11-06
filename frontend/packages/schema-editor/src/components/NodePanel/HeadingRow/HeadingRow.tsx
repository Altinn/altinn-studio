import classes from './HeadingRow.module.css';
import { NodeIcon } from '../../NodeIcon';
import React from 'react';
import { useSchemaEditorAppContext } from '../../../hooks/useSchemaEditorAppContext';
import { extractNameFromPointer, isNodeValidParent, ROOT_POINTER } from '@altinn/schema-model';
import { StudioButton, StudioHeading } from '@studio/components';
import cn from 'classnames';
import { AddNodeMenu } from './AddNodeMenu';
import { DeleteTypeButton } from './DeleteTypeButton';
import { DeleteModelButton } from './DeleteModelButton';

export interface HeadingRowProps {
  schemaPointer?: string;
}

export const HeadingRow = ({ schemaPointer }: HeadingRowProps) => {
  const { setSelectedUniquePointer, selectedUniquePointer, name, schemaModel } =
    useSchemaEditorAppContext();
  const isDataModelRoot = !schemaPointer;
  const nodeRootPointer = isDataModelRoot ? ROOT_POINTER : schemaPointer;
  const node = schemaModel.getNodeBySchemaPointer(nodeRootPointer);
  const selectNodeRoot = () => setSelectedUniquePointer(nodeRootPointer);
  const title = isDataModelRoot ? name : extractNameFromPointer(schemaPointer);
  const isValidParent = isNodeValidParent(node);
  const isSelected = selectedUniquePointer === nodeRootPointer;

  return (
    <div className={cn(classes.root, isSelected && classes.selected)}>
      <StudioHeading level={1}>
        <StudioButton
          className={classes.headingButton}
          color='second'
          icon={<NodeIcon node={node} />}
          onClick={selectNodeRoot}
          variant='tertiary'
        >
          {title}
        </StudioButton>
      </StudioHeading>
      {isValidParent && <AddNodeMenu schemaPointer={schemaPointer} />}
      {isDataModelRoot ? <DeleteModelButton /> : <DeleteTypeButton schemaPointer={schemaPointer} />}
    </div>
  );
};
