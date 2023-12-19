import React, { ReactElement, ReactNode } from 'react';
import {
  extractNameFromPointer,
  isNodeValidParent,
  isReference,
  UiSchemaNode,
} from '@altinn/schema-model';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';
import { renderSchemaNodeList } from '../renderSchemaNodeList';
import { renderIcon } from './renderIcon';
import { ActionButtons } from '@altinn/schema-editor/components/SchemaTree/SchemaNode/ActionButtons/ActionButtons';
import classes from './SchemaNode.module.css';
import { ReferenceButton } from '@altinn/schema-editor/components/SchemaTree/SchemaNode/ReferenceButton';
import { SavableSchemaModel } from '@altinn/schema-editor/classes/SavableSchemaModel';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import { useSavableSchemaModel } from '@altinn/schema-editor/hooks/useSavableSchemaModel';

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
  return (
    <DragAndDropTree.Item
      emptyMessage={t('schema_editor.empty_node')}
      expandable={isNodeValidParent(node)}
      icon={renderIcon(savableModel, pointer)}
      label={label}
      labelWrapper={labelWrapper(savableModel, pointer)}
      nodeId={pointer}
      title={title}
    >
      {renderSchemaNodeList(savableModel, pointer)}
    </DragAndDropTree.Item>
  );
};

const labelWrapper = (schemaModel: SavableSchemaModel, pointer: string) => {
  const LabelWrapper = (label: ReactNode) => {
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

  LabelWrapper.displayName = 'LabelWrapper';
  return LabelWrapper;
};

const createWrapperClassNames = (schemaModel: SavableSchemaModel, node: UiSchemaNode): string => {
  const { isArray } = node;
  const finalNode = schemaModel.getFinalNode(node.pointer);
  const isParentNode = isNodeValidParent(finalNode) ;
  return cn(classes.schemaNodeLabel, isArray && classes.isArray, isParentNode && classes.isParent);
};
