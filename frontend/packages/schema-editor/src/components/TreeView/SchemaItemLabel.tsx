import type { SyntheticEvent } from 'react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  deleteNode,
  getCapabilities,
  getNameFromPointer,
  pointerIsDefinition,
  promoteProperty,
} from '@altinn/schema-model';
import { AltinnMenu, AltinnMenuItem } from 'app-shared/components';
import { Button, ButtonColor, ButtonSize, ButtonVariant, Popover, PopoverVariant } from '@digdir/design-system-react';
import { MenuElipsisVerticalIcon, ExclamationmarkTriangleIcon } from '@navikt/aksel-icons';
import { useDispatch } from 'react-redux';
import {
  navigateToType,
  removeSelection,
  setSelectedAndFocusedNode,
  setSelectedNode,
} from '../../features/editor/schemaEditorSlice';
import { useDatamodelQuery } from '@altinn/schema-editor/hooks/queries';
import { useDatamodelMutation } from '@altinn/schema-editor/hooks/mutations';
import { useTranslation } from 'react-i18next';

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
  const dispatch = useDispatch();
  const [contextAnchor, setContextAnchor] = useState<any>(null);
  const { data } = useDatamodelQuery();
  const { mutate } = useDatamodelMutation();
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const toggleConfirmDeletePopover = () => setIsConfirmDeleteOpen((prev) => !prev);
  const { t } = useTranslation();


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

  const handleDeleteClick = wrapper(() => {
    mutate(deleteNode(data, selectedNode.pointer));
    dispatch(removeSelection(selectedNode.pointer));
  });

  const isArray = selectedNode.isArray || refNode?.isArray;

  const isRef = refNode || pointerIsDefinition(selectedNode.pointer);
  const capabilties = getCapabilities(selectedNode);

  const useClickOutside = (ref, onClickOutside) => {
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (ref.current && !ref.current.contains(event.target)) {
          onClickOutside();
        }
      };
     document.addEventListener('mousedown', handleClickOutside);
    }, [ref, onClickOutside]);
  };

  const handleClosePopover = useCallback(() => { setIsConfirmDeleteOpen(false); }, []);
  const popoverRef = useRef(null);
  useClickOutside(popoverRef, handleClosePopover);

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
        {selectedNode.isRequired && <span> *</span>}
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
          <div ref={popoverRef}>
            <Popover
              variant={PopoverVariant.Warning}
              placement={'left'}
              open={isConfirmDeleteOpen}
              className={classes.popover}
              trigger={
                <AltinnMenuItem
                  testId={SchemaItemLabelTestIds.contextMenuDelete}
                  id='delete-node-button'
                  key='delete'
                  className={classes.contextMenuLastItem}
                  onClick={toggleConfirmDeletePopover}
                  text={hasReferredNodes ? 'Kan ikke slettes, er i bruk.' : translate('delete')}
                  iconClass='fa fa-trash'
                  disabled={hasReferredNodes}
                />
              }
            >
              <p>{t('schema_editor.datamodel_field_deletion_text')}</p>
              <p className={classes.popoverInfo}>{t('schema_editor.datamodel_field_deletion_info')}</p>
              <Button onClick={handleDeleteClick} color={ButtonColor.Danger}>
                {t('schema_editor.datamodel_field_deletion_confirm')}
              </Button>
              <Button
                variant={ButtonVariant.Quiet}
                onClick={toggleConfirmDeletePopover}
                color={ButtonColor.Secondary}
              >
                {t('schema_editor.datamodel_field_deletion_cancel')}
              </Button>
            </Popover>
          </div>
        )}
      </AltinnMenu>
    </div>
  );
};
