import React, { useState } from 'react';
import { TreeItem } from '@mui/lab';
import { useDispatch, useSelector } from 'react-redux';
import { setSelectedId } from '../../features/editor/schemaEditorSlice';
import { SchemaItemLabel } from './SchemaItemLabel';
import { getIconStr } from './tree-view-helpers';
import type { UiSchemaNode, UiSchemaNodes } from '@altinn/schema-model';
import {
  getChildNodesByPointer,
  getReferredNodes,
  ObjectKind,
  changeChildrenOrder,
  splitPointerInBaseAndName,
} from '@altinn/schema-model';
import classes from './SchemaItem.module.css';
import classNames from 'classnames';
import { DndItem } from './DnDWrapper';
import type { DragItem } from './dnd-helpers';
import { useDatamodelQuery } from '@altinn/schema-editor/hooks/queries';
import { useDatamodelMutation } from '@altinn/schema-editor/hooks/mutations';
import { getRefNodeSelector, selectedIdSelector } from '@altinn/schema-editor/selectors/schemaStateSelectors';
import { AltinnConfirmDialog } from 'app-shared/components';
import { useTranslation } from 'react-i18next';
import { deleteNode } from '@altinn/schema-model';
import { removeSelection } from '../../features/editor/schemaEditorSlice';

export type SchemaItemProps = {
  selectedNode: UiSchemaNode;
  translate: (key: string) => string;
  isPropertiesView: boolean;
  onLabelClick?: (e: any) => void;
  index: number;
};

SchemaItem.defaultProps = {
  isPropertiesView: false,
};

export function SchemaItem({
  selectedNode,
  isPropertiesView,
  translate,
  index,
}: SchemaItemProps) {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { data } = useDatamodelQuery();
  const { mutate } = useDatamodelMutation();
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState<boolean>();

  const keyPrefix = isPropertiesView ? 'properties' : 'definitions';

  const refNode = getRefNodeSelector(selectedNode)(data);
  const childNodes = getChildNodesByPointer(data, (refNode || selectedNode).pointer);
  const referredNodes = getReferredNodes(data, selectedNode.pointer);
  const focusedNode = refNode ?? selectedNode;
  const childNodesSorted: UiSchemaNodes = [];
  focusedNode.children.forEach((childPointer) => {
    const node = childNodes.find((childNode) => childNode.pointer === childPointer);
    node && childNodesSorted.push(node);
  });
  const selectedPointer = useSelector(selectedIdSelector);
  const onLabelClick = (e: any, schemaItem: UiSchemaNode) => {
    e.preventDefault();
    if (selectedPointer !== schemaItem.pointer) {
      dispatch(setSelectedId({ pointer: schemaItem.pointer }));
    }
  };
  const isRef = selectedNode.objectKind === ObjectKind.Reference;
  const { base } = splitPointerInBaseAndName(selectedNode.pointer);
  const onMove = (from: DragItem, to: DragItem) =>
    mutate(changeChildrenOrder(data, { pointerA: from.itemId, pointerB: to.itemId }));

  const handleDeleteClick = () => {
    mutate(deleteNode(data, selectedNode.pointer));
    dispatch(removeSelection(selectedNode.pointer));
  };

  return (
    <TreeItem
      nodeId={selectedNode.pointer}
      classes={{ root: classNames(classes.treeItem, isRef && classes.isRef) }}
      onClick={(e: any) => onLabelClick(e, selectedNode)}
      onFocusCapture={(e: any) => e.stopPropagation()}
      label={
        <>
          <DndItem index={index} itemId={selectedNode.pointer} containerId={base} onMove={onMove}>
            <SchemaItemLabel
              icon={getIconStr(refNode ?? selectedNode)}
              key={`${selectedNode.pointer}-label`}
              selectedNode={selectedNode}
              refNode={refNode}
              translate={translate}
              hasReferredNodes={isPropertiesView ? false : referredNodes.length > 0}
              openConfirmDeleteDialog={() => setIsConfirmDeleteDialogOpen(prevState => !prevState)}
            />
          </DndItem>
          <AltinnConfirmDialog
            open={isConfirmDeleteDialogOpen}
            confirmText={t('schema_editor.datamodel_field_deletion_confirm')}
            onConfirm={handleDeleteClick}
            onClose={() => setIsConfirmDeleteDialogOpen(false)}
            placement='bottom'
            trigger={<div className={classes.confirmDeleteDialogTrigger} />}
          >
            <p>{t('schema_editor.datamodel_field_deletion_text')}</p>
            <p>{t('schema_editor.datamodel_field_deletion_info')}</p>
          </AltinnConfirmDialog>
        </>
      }
    >
      {childNodesSorted.map((childNode: UiSchemaNode, childNodeIndex: number) => (
        <SchemaItem
          index={childNodeIndex}
          isPropertiesView={isPropertiesView}
          selectedNode={childNode}
          key={`${keyPrefix}-${childNode.pointer}`}
          translate={translate}
          onLabelClick={(e: any) => onLabelClick(e, childNode)}
        />
      ))}
    </TreeItem>
  );
}
