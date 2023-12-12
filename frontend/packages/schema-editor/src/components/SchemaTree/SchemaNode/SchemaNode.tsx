import React, { ReactElement, ReactNode } from 'react';
import { extractNameFromPointer, isNodeValidParent, isReference } from '@altinn/schema-model';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';
import { renderSchemaNodeList } from '../renderSchemaNodeList';
import { renderIcon } from './renderIcon';
import { ActionButtons } from '@altinn/schema-editor/components/SchemaTree/SchemaNode/ActionButtons/ActionButtons';
import classes from './SchemaNode.module.css';
import { ReferenceButton } from '@altinn/schema-editor/components/SchemaTree/SchemaNode/ReferenceButton';
import { SavableSchemaModel } from '@altinn/schema-editor/classes/SavableSchemaModel';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';

export interface SchemaNodeProps {
  pointer: string;
  savableModel: SavableSchemaModel;
}

export const SchemaNode = ({ pointer, savableModel }: SchemaNodeProps): ReactElement => {
  const { t } = useTranslation();
  const node = savableModel.getNode(pointer);
  return (
    <DragAndDropTree.Item
      icon={renderIcon(savableModel, pointer)}
      label={extractNameFromPointer(pointer)}
      labelWrapper={labelWrapper(savableModel, pointer)}
      nodeId={pointer}
      expandable={isNodeValidParent(node)}
      emptyMessage={t('schema_editor.empty_node')}
    >
      {renderSchemaNodeList(savableModel, pointer)}
    </DragAndDropTree.Item>
  );
};

const labelWrapper = (schemaModel: SavableSchemaModel, pointer: string) => {
  const LabelWrapper = (label: ReactNode) => {
    const node = schemaModel.getNode(pointer);
    const { isArray } = node;
    const isParentNode = isNodeValidParent(node);
    const className = cn(
      classes.schemaNodeLabel,
      isArray && classes.isArray,
      isParentNode && classes.isParent,
    );

    return (
      <div className={className}>
        <div className={classes.nodeName}>{label}</div>
        {isReference(node) && <ReferenceButton savableModel={schemaModel} node={node} />}
        <ActionButtons
          className={classes.actionButtons}
          savableModel={schemaModel}
          pointer={pointer}
        />
      </div>
    );
  };

  LabelWrapper.displayName = 'LabelWrapper';
  return LabelWrapper;
};
