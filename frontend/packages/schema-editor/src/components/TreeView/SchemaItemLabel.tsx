import type { SyntheticEvent } from 'react';
import React, { useState } from 'react';
import classNames from 'classnames';
import classes from './SchemaItemLabel.module.css';
import type { UiSchemaNode } from '@altinn/schema-model';
import {
  Capabilites,
  CombinationKind,
  FieldType,
  Keyword,
  ObjectKind,
  addCombinationItem,
  addProperty,
  getCapabilities,
  getNameFromPointer,
  pointerIsDefinition,
  promoteProperty,
} from '@altinn/schema-model';
import { AltinnMenu, AltinnMenuItem } from 'app-shared/components';
import { Button, ButtonSize, ButtonVariant } from '@digdir/design-system-react';
import { MenuElipsisVerticalIcon, ExclamationmarkTriangleIcon } from '@navikt/aksel-icons';
import { useDispatch } from 'react-redux';
import {
  navigateToType,
  setSelectedAndFocusedNode,
  setSelectedNode,
} from '../../features/editor/schemaEditorSlice';
import { useDatamodelQuery } from '@altinn/schema-editor/hooks/queries';
import { useDatamodelMutation } from '@altinn/schema-editor/hooks/mutations';
import { useTranslation } from 'react-i18next';
import { AltinnConfirmDialog } from 'app-shared/components';
import { deleteNode } from '@altinn/schema-model';
import { removeSelection } from '../../features/editor/schemaEditorSlice';

export interface SchemaItemLabelProps {
  hasReferredNodes: boolean;
  icon: string;
  refNode?: UiSchemaNode;
  selectedNode: UiSchemaNode;
  translate: (key: string) => string;
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
  translate,
}: SchemaItemLabelProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [contextAnchor, setContextAnchor] = useState<any>(null);
  const { data } = useDatamodelQuery();
  const { mutate } = useDatamodelMutation();
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState<boolean>();

  // Simple wrapper to avoid repeating ourselves...
  const wrapper = (callback: (arg: any) => void) => {
    return (e: SyntheticEvent, arg?: any) => {
      e.stopPropagation();
      setContextAnchor(null);
      callback(arg);
    };
  };

  const handleGoToType = wrapper(() => {
    dispatch(navigateToType({ pointer: selectedNode.reference }));
  });
  const handleConvertToReference = wrapper(() => {
    mutate(promoteProperty(data, selectedNode.pointer));
  });
  const handleConvertToField = wrapper(() => {
    mutate(promoteProperty(data, selectedNode.pointer));
  });
  const handleCloseContextMenu = wrapper(() => undefined);

  const handleToggleContextMenuClick = (e: SyntheticEvent) => {
    e.stopPropagation();
    setContextAnchor(e.currentTarget);
  };

  const handleAddNode = wrapper((objectKind: ObjectKind) => {
    const props = {
      objectKind,
      fieldType: {
        [ObjectKind.Field]: FieldType.String,
        [ObjectKind.Combination]: CombinationKind.AllOf,
        [ObjectKind.Reference]: undefined,
      }[objectKind],
      reference: objectKind === ObjectKind.Reference ? '' : undefined,
    };
    const { pointer } = selectedNode;
    selectedNode.objectKind === ObjectKind.Combination
      ? mutate(
        addCombinationItem(data, {
          pointer,
          props,
          callback: (newPointer: string) => dispatch(setSelectedNode(newPointer))
        })
      )
      : mutate(
        addProperty(data, {
          pointer,
          props,
          callback: (newPointer: string) => dispatch(setSelectedAndFocusedNode(newPointer))
        })
      );
  });

  const handleDeleteClick = () => {
    mutate(deleteNode(data, selectedNode.pointer));
    dispatch(removeSelection(selectedNode.pointer));
  };

  const isArray = selectedNode.isArray || refNode?.isArray;

  const isRef = refNode || pointerIsDefinition(selectedNode.pointer);
  const capabilties = getCapabilities(selectedNode);

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
        <span>{getNameFromPointer(selectedNode)}</span>
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
        data-testid='open-context-menu-button'
        className={classes.contextButton}
        aria-controls='simple-menu'
        aria-haspopup='true'
        title={translate('open_action_menu')}
        onClick={handleToggleContextMenuClick}
        icon={<MenuElipsisVerticalIcon />}
        variant={ButtonVariant.Quiet}
        size={ButtonSize.Small}
      />
      <AltinnMenu
        id='root-properties-context-menu'
        anchorEl={contextAnchor}
        open={Boolean(contextAnchor)}
        onClose={handleCloseContextMenu}
      >
        {capabilties.includes(Capabilites.CanHaveReferenceAdded) && (
          <AltinnMenuItem
            testId={SchemaItemLabelTestIds.contextMenuAddReference}
            id='add-reference-to-node-button'
            data-testid={''}
            key='add_reference'
            onClick={(event) => handleAddNode(event, ObjectKind.Reference)}
            text={translate('add_reference')}
            iconClass='fa fa-datamodel-ref'
          />
        )}
        {capabilties.includes(Capabilites.CanHaveFieldAdded) && (
          <AltinnMenuItem
            testId={SchemaItemLabelTestIds.contextMenuAddField}
            id='add-field-to-node-button'
            key='add_field'
            onClick={(event) => handleAddNode(event, ObjectKind.Field)}
            text={translate('add_field')}
            iconClass='fa fa-datamodel-properties'
          />
        )}
        {capabilties.includes(Capabilites.CanHaveCombinationAdded) && (
          <AltinnMenuItem
            testId={SchemaItemLabelTestIds.contextMenuAddCombination}
            id='add-combination-to-node-button'
            key='add_combination'
            onClick={(event) => handleAddNode(event, ObjectKind.Combination)}
            text={translate('add_combination')}
            iconClass='fa fa-group'
          />
        )}
        {capabilties.includes(Capabilites.CanBeConvertedToReference) && (
          <AltinnMenuItem
            testId={SchemaItemLabelTestIds.contextMenuConvertToReference}
            id='convert-node-to-reference-button'
            key='convert-node-to-reference'
            onClick={handleConvertToReference}
            text={translate('promote')}
            iconClass='fa fa-arrowup'
          />
        )}
        {capabilties.includes(Capabilites.CanBeConvertedToField) && (
          <AltinnMenuItem
            testId={SchemaItemLabelTestIds.contextMenuConvertToField}
            id='convert-node-to-field-buttonn'
            key='convert-node-to-field'
            onClick={handleConvertToField}
            text={translate('convert_to_field')}
            iconClass='fa fa-arrowdown'
            disabled={true}
          />
        )}
        {capabilties.includes(Capabilites.CanBeDeleted) && (
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
                  setIsConfirmDeleteDialogOpen(prevState => !prevState);
                }}
                text={hasReferredNodes ? translate('in_use_error') : translate('delete')}
                iconClass='fa fa-trash'
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
