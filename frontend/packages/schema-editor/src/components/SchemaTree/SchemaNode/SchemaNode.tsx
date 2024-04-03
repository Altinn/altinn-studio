import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import type { SchemaModel, UiSchemaNode } from '@altinn/schema-model';
import { extractNameFromPointer, isNodeValidParent, isReference } from '@altinn/schema-model';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';
import { renderSchemaNodeList } from '../renderSchemaNodeList';
import { renderIcon } from './renderIcon';
import { ActionButtons } from './ActionButtons';
import classes from './SchemaNode.module.css';
import { ReferenceButton } from './ReferenceButton';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import { useSavableSchemaModel } from '../../../hooks/useSavableSchemaModel';

export interface SchemaNodeProps {
  pointer: string;
}

export const SchemaNode = ({ pointer }: SchemaNodeProps): ReactElement => {
  const savableModel = useSavableSchemaModel();
  const { t } = useTranslation();
  const node = savableModel.getNode(pointer);
  const label = savableModel.isChildOfCombination(pointer) ? '' : extractNameFromPointer(pointer);
  const index = savableModel.getIndexOfChildNode(pointer);
  const title = label || t('schema_editor.tree.combination_child_title', { index });

  const labelWrapper = (labelComponent: ReactNode) => (
    <LabelWrapper label={labelComponent} pointer={pointer} schemaModel={savableModel} />
  );

  return (
    <DragAndDropTree.Item
      emptyMessage={t('schema_editor.empty_node')}
      expandable={isNodeValidParent(node)}
      icon={renderIcon(savableModel, pointer)}
      label={label}
      labelWrapper={labelWrapper}
      nodeId={pointer}
      title={title}
    >
      {renderSchemaNodeList(savableModel, pointer)}
    </DragAndDropTree.Item>
  );
};

interface LabelWrapperProps {
  label: ReactNode;
  pointer: string;
  schemaModel: SchemaModel;
}

const LabelWrapper = ({ label, pointer, schemaModel }: LabelWrapperProps) => {
  const node = schemaModel.getNode(pointer);
  const className = createWrapperClassNames(schemaModel, node);
  return (
    <div className={className}>
      <div className={classes.nodeName}>{label}</div>
      {isReference(node) && <ReferenceButton node={node} />}
      <ActionButtons className={classes.actionButtons} pointer={pointer} />
    </div>
  );
};

const createWrapperClassNames = (schemaModel: SchemaModel, node: UiSchemaNode): string => {
  const { isArray } = node;
  const finalNode = schemaModel.getFinalNode(node.pointer);
  const isParentNode = isNodeValidParent(finalNode);
  return cn(classes.schemaNodeLabel, isArray && classes.isArray, isParentNode && classes.isParent);
};
