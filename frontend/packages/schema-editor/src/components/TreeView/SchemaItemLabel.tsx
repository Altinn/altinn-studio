import type { MouseEvent, SyntheticEvent } from 'react';
import React, { useState } from 'react';
import classNames from 'classnames';
import classes from './SchemaItemLabel.module.css';
import type { UiSchemaNode } from '@altinn/schema-model';
import {
  Capabilites,
  Keyword,
  ObjectKind,
  getCapabilities,
  pointerIsDefinition,
  promoteProperty,
  FieldType,
  extractNameFromPointer,
} from '@altinn/schema-model';
import { AltinnMenu, AltinnMenuItem } from 'app-shared/components';
import { Button } from '@digdir/design-system-react';
import { MenuElipsisVerticalIcon, ExclamationmarkTriangleIcon } from '@navikt/aksel-icons';
import { useDispatch } from 'react-redux';
import {
  navigateToType,
  setSelectedAndFocusedNode,
  setSelectedNode,
} from '../../features/editor/schemaEditorSlice';
import { useTranslation } from 'react-i18next';
import { AltinnConfirmDialog } from 'app-shared/components';
import { deleteNode } from '@altinn/schema-model';
import { removeSelection } from '../../features/editor/schemaEditorSlice';
import {
  LinkIcon,
  BulletListIcon,
  TabsIcon,
  ArrowUpIcon,
  TrashIcon,
  ArrowDownIcon,
} from '@navikt/aksel-icons';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';
import { isCombination, isReference } from '../../../../schema-model';
import { useAddProperty } from '@altinn/schema-editor/hooks/useAddProperty';

export interface SchemaItemLabelProps {
  hasReferredNodes: boolean;
  icon: string;
  refNode?: UiSchemaNode;
  selectedNode: UiSchemaNode;
}
export enum SchemaItemLabelTestIds {
  contextMenuAddReference = 'context-menu-add-reference',
  contextMenuDelete = 'context-menu-delete',
  contextMenuConvertToField = 'context-menu-convert-to-field',
  contextMenuConvertToReference = 'context-menu-convert-to-reference',
  contextMenuAddField = 'context-menu-add-field',
  contextMenuAddCombination = 'context-menu-add-combination',
}
export const SchemaItemLabel = ({
  hasReferredNodes,
  icon,
  refNode,
  selectedNode,
}: SchemaItemLabelProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [contextAnchor, setContextAnchor] = useState<any>(null);
  const { schemaModel, save } = useSchemaEditorAppContext();
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState<boolean>();
  const addProperty = useAddProperty();

  // Simple wrapper to avoid repeating ourselves...
  const wrapper = (callback: (arg: any) => void) => {
    return (e: SyntheticEvent, arg?: any) => {
      e.stopPropagation();
      setContextAnchor(null);
      callback(arg);
    };
  };

  const handleGoToType = wrapper(() => {
    if (isReference(selectedNode)) {
      dispatch(navigateToType({ pointer: selectedNode.reference }));
    }
  });
  const handleConvertToReference = wrapper(() => {
    save(promoteProperty(schemaModel, selectedNode.pointer));
  });
  const handleConvertToField = wrapper(() => {
    save(promoteProperty(schemaModel, selectedNode.pointer));
  });
  const handleCloseContextMenu = wrapper(() => undefined);

  const handleToggleContextMenuClick = (e: SyntheticEvent) => {
    e.stopPropagation();
    setContextAnchor(e.currentTarget);
  };

  const handleAddNode = (objectKind: ObjectKind, fieldType?: FieldType) => (event: MouseEvent) => {
    event.stopPropagation();
    setContextAnchor(null);
    const newPointer = addProperty(objectKind, fieldType, selectedNode.pointer);
    if (newPointer) {
      dispatch(
        isCombination(selectedNode)
          ? setSelectedNode(newPointer)
          : setSelectedAndFocusedNode(newPointer),
      );
    }
  };

  const handleDeleteClick = () => {
    save(deleteNode(schemaModel, selectedNode.pointer));
    dispatch(removeSelection(selectedNode.pointer));
  };

  const isArray = selectedNode.isArray || refNode?.isArray;

  const isRef = refNode || pointerIsDefinition(selectedNode.pointer);
  const capabilities = getCapabilities(selectedNode);

  return (
    <div
      className={classNames(classes.propertiesLabel, {
        [classes.isArray]: isArray,
        [classes.isRef]: isRef,
      })}
    >
      <div className={classes.label} title={selectedNode.pointer}>
        <span className={classes.iconContainer}>
          <i className={`fa ${icon}`} />
        </span>{' '}
        <span>{extractNameFromPointer(selectedNode.pointer)}</span>
        {selectedNode.isRequired && <span aria-hidden> *</span>}
        {hasReferredNodes && <span className={classes.greenDot}> ●</span>}
        {refNode && (
          <span
            className={classes.referenceLabel}
            onClick={handleGoToType}
            onKeyUp={handleGoToType}
            role={'link'}
            tabIndex={-1}
          >
            {refNode.pointer.replace(`#/${Keyword.Definitions}/`, '')}
          </span>
        )}
        {selectedNode.objectKind === ObjectKind.Reference && !refNode && (
          <span className={classes.warning}>
            <ExclamationmarkTriangleIcon />
            Kan ikke lagre modellen uten at type er satt.
          </span>
        )}
      </div>
      <Button
        className={classes.contextButton}
        aria-controls='simple-menu'
        aria-haspopup='true'
        title={t('schema_editor.open_action_menu')}
        onClick={handleToggleContextMenuClick}
        icon={<MenuElipsisVerticalIcon />}
        variant='tertiary'
        size='small'
      />
      <AltinnMenu
        id='root-properties-context-menu'
        anchorEl={contextAnchor}
        open={Boolean(contextAnchor)}
        onClose={handleCloseContextMenu}
      >
        {capabilities.includes(Capabilites.CanHaveReferenceAdded) && (
          <AltinnMenuItem
            testId={SchemaItemLabelTestIds.contextMenuAddReference}
            id='add-reference-to-node-button'
            key='add_reference'
            onClick={handleAddNode(ObjectKind.Reference)}
            text={t('schema_editor.add_reference')}
            icon={LinkIcon}
          />
        )}
        {capabilities.includes(Capabilites.CanHaveFieldAdded) && (
          <AltinnMenuItem
            testId={SchemaItemLabelTestIds.contextMenuAddField}
            id='add-field-to-node-button'
            key='add_field'
            onClick={handleAddNode(ObjectKind.Field)}
            text={t('schema_editor.add_field')}
            icon={BulletListIcon}
          />
        )}
        {capabilities.includes(Capabilites.CanHaveCombinationAdded) && (
          <AltinnMenuItem
            testId={SchemaItemLabelTestIds.contextMenuAddCombination}
            id='add-combination-to-node-button'
            key='add_combination'
            onClick={handleAddNode(ObjectKind.Combination)}
            text={t('schema_editor.add_combination')}
            icon={TabsIcon}
          />
        )}
        {capabilities.includes(Capabilites.CanBeConvertedToReference) && (
          <AltinnMenuItem
            testId={SchemaItemLabelTestIds.contextMenuConvertToReference}
            id='convert-node-to-reference-button'
            key='convert-node-to-reference'
            onClick={handleConvertToReference}
            text={t('schema_editor.promote')}
            icon={ArrowUpIcon}
          />
        )}
        {capabilities.includes(Capabilites.CanBeConvertedToField) && (
          <AltinnMenuItem
            testId={SchemaItemLabelTestIds.contextMenuConvertToField}
            id='convert-node-to-field-buttonn'
            key='convert-node-to-field'
            onClick={handleConvertToField}
            text={t('schema_editor.convert_to_field')}
            icon={ArrowDownIcon}
            disabled={true}
          />
        )}
        {capabilities.includes(Capabilites.CanBeDeleted) && (
          <AltinnConfirmDialog
            open={isConfirmDeleteDialogOpen}
            confirmText={t('schema_editor.datamodel_field_deletion_confirm')}
            onConfirm={() => {
              handleDeleteClick();
              setContextAnchor(null);
            }}
            onClose={() => {
              setIsConfirmDeleteDialogOpen(false);
              setContextAnchor(null);
            }}
            trigger={
              <AltinnMenuItem
                testId={SchemaItemLabelTestIds.contextMenuDelete}
                id='delete-node-button'
                key='delete'
                className={classes.contextMenuLastItem}
                onClick={(event) => {
                  event.stopPropagation();
                  setIsConfirmDeleteDialogOpen((prevState) => !prevState);
                }}
                text={
                  hasReferredNodes ? t('schema_editor.in_use_error') : t('schema_editor.delete')
                }
                icon={TrashIcon}
                disabled={hasReferredNodes}
              />
            }
          >
            <p>{t('schema_editor.datamodel_field_deletion_text')}</p>
            <p>{t('schema_editor.datamodel_field_deletion_info')}</p>
          </AltinnConfirmDialog>
        )}
      </AltinnMenu>
    </div>
  );
};
