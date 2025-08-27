import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import type { UiSchemaNode } from '@altinn/schema-model/index';
import {
  SchemaModel,
  extractNameFromPointer,
  isNodeValidParent,
  isReference,
} from '@altinn/schema-model/index';
import { StudioDragAndDropTree } from 'libs/studio-components-legacy/src';
import { renderSchemaNodeList } from '../renderSchemaNodeList';
import { renderIcon } from './renderIcon';
import { ActionButtons } from './ActionButtons';
import classes from './SchemaNode.module.css';
import { ReferenceButton } from './ReferenceButton';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import { useSavableSchemaModel } from '../../../hooks/useSavableSchemaModel';

export interface SchemaNodeProps {
  schemaPointer: string;
  uniqueParentPointer?: string;
}

export const SchemaNode = ({
  schemaPointer,
  uniqueParentPointer,
}: SchemaNodeProps): ReactElement => {
  const savableModel = useSavableSchemaModel();
  const { t } = useTranslation();
  const node = savableModel.getNodeBySchemaPointer(schemaPointer);
  const label = savableModel.isChildOfCombination(schemaPointer)
    ? ''
    : extractNameFromPointer(schemaPointer);
  const index = savableModel.getIndexOfChildNode(schemaPointer);
  const uniquePointer = SchemaModel.getUniquePointer(schemaPointer, uniqueParentPointer);

  const title = label || t('schema_editor.tree.combination_child_title', { index });
  const labelWrapper = (labelComponent: ReactNode) => (
    <LabelWrapper
      label={labelComponent}
      schemaPointer={schemaPointer}
      schemaModel={savableModel}
      uniquePointer={uniquePointer}
    />
  );

  return (
    <StudioDragAndDropTree.Item
      emptyMessage={t('schema_editor.empty_node')}
      expandable={isNodeValidParent(node)}
      icon={renderIcon(savableModel, schemaPointer)}
      label={label}
      labelWrapper={labelWrapper}
      nodeId={uniquePointer}
      title={title}
    >
      {renderSchemaNodeList(savableModel, schemaPointer, uniquePointer)}
    </StudioDragAndDropTree.Item>
  );
};

interface LabelWrapperProps {
  label: ReactNode;
  schemaPointer: string;
  schemaModel: SchemaModel;
  uniquePointer: string;
}

const LabelWrapper = ({ label, schemaPointer, uniquePointer, schemaModel }: LabelWrapperProps) => {
  const node = schemaModel.getNodeBySchemaPointer(schemaPointer);
  const className = createWrapperClassNames(schemaModel, node);
  return (
    <div className={className}>
      <div className={classes.nodeName}>{label}</div>
      {isReference(node) && <ReferenceButton node={node} />}
      <ActionButtons
        className={classes.actionButtons}
        schemaPointer={schemaPointer}
        uniquePointer={uniquePointer}
      />
    </div>
  );
};

const createWrapperClassNames = (schemaModel: SchemaModel, node: UiSchemaNode): string => {
  const { isArray, schemaPointer } = node;
  const finalNode = schemaModel.getFinalNode(schemaPointer);
  const isParentNode = isNodeValidParent(finalNode);
  return cn(classes.schemaNodeLabel, isArray && classes.isArray, isParentNode && classes.isParent);
};
