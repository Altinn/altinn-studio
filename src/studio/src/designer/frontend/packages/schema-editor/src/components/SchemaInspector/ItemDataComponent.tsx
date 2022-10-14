import { TextField as MaterialTextField } from '@material-ui/core';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { ILanguage, ISchemaState } from '../../types';
import { NameError } from '../../types';
import { getTranslation } from '../../utils/language';
import {
  addCombinationItem,
  deleteCombinationItem,
  navigateToType,
  setCombinationType,
  setDescription,
  setPropertyName,
  setRef,
  setTitle,
  setType,
  toggleArrayField,
} from '../../features/editor/schemaEditorSlice';
import { ReferenceSelectionComponent } from './ReferenceSelectionComponent';
import { CombinationSelect } from './CombinationSelect';
import { getCombinationOptions, getTypeOptions } from './helpers/options';
import { Checkbox, ErrorMessage, TextField } from '@altinn/altinn-design-system';
import classes from './ItemDataComponent.module.css';
import { ItemRestrictions } from './ItemRestrictions';
import type { UiSchemaNode } from '@altinn/schema-model';
import {
  canToggleArrayAndField,
  combinationIsNullable,
  CombinationKind,
  FieldType,
  getChildNodesByNode,
  getNodeDisplayName,
  Keywords,
  makePointer,
  ObjectKind,
  pointerExists,
} from '@altinn/schema-model';
import { getDomFriendlyID, isValidName } from '../../utils/ui-schema-utils';
import { Divider } from '../common/Divider';
import { Fieldset } from '../common/Fieldset';
import { Label } from '../common/Label';
import { Select } from '../common/Select';

export interface IItemDataComponentProps {
  selectedItem: UiSchemaNode;
  language: ILanguage;
}

export function ItemDataComponent({ language, selectedItem }: IItemDataComponentProps) {
  const dispatch = useDispatch();
  const selectedNodePointer = selectedItem.pointer;
  const [nameError, setNameError] = useState('');
  const [nodeName, setNodeName] = useState('');
  const [description, setItemDescription] = useState<string>('');
  const [title, setItemTitle] = useState<string>('');
  const { fieldType } = selectedItem;

  const childNodes = useSelector((state: ISchemaState) => getChildNodesByNode(state.uiSchema, selectedItem));
  const itemsNode = selectedItem.objectKind === ObjectKind.Array ? childNodes[0] : undefined;
  useEffect(() => {
    setNodeName(getNodeDisplayName(selectedItem));
    setNameError(NameError.NoError);
    setItemTitle(selectedItem.title ?? '');
    setItemDescription(selectedItem.description ?? '');
  }, [selectedItem]);

  const arrayType = selectedItem.objectKind === ObjectKind.Array ? itemsNode?.fieldType : undefined;
  const onNameChange = (e: any) => {
    const { value } = e.target;
    setNodeName(value);
    !isValidName(value) ? setNameError(NameError.InvalidCharacter) : setNameError(NameError.NoError);
  };

  const onChangeRef = (path: string, ref: string) => dispatch(setRef({ path, ref }));

  const onChangeFieldType = (pointer: string, type: FieldType) =>
    dispatch(setType({ path: selectedItem.pointer, type }));

  const onChangeNullable = (event: any) => {
    if (event.target.checked) {
      dispatch(addCombinationItem({ path: selectedItem.pointer, props: { fieldType: FieldType.Null } }));
    } else {
      childNodes.forEach((childNode: UiSchemaNode) => {
        if (childNode.fieldType === FieldType.Null) {
          dispatch(deleteCombinationItem({ path: childNode.pointer }));
        }
      });
    }
  };

  const onChangeTitle = () => dispatch(setTitle({ path: selectedNodePointer, title }));

  const onChangeDescription = () => dispatch(setDescription({ path: selectedNodePointer, description }));

  const onGoToDefButtonClick = () => {
    const ref = selectedItem.objectKind === ObjectKind.Array ? itemsNode?.ref : selectedItem.ref;
    if (ref !== undefined) {
      dispatch(navigateToType({ id: ref }));
    }
  };

  const onChangeCombinationType = (value: CombinationKind) =>
    dispatch(setCombinationType({ path: selectedItem.pointer, type: value }));

  const handleArrayPropertyToggle = () => dispatch(toggleArrayField({ pointer: selectedItem.pointer }));

  const uiSchema = useSelector((state: ISchemaState) => state.uiSchema);
  const handleChangeNodeName = () => {
    if (pointerExists(uiSchema, nodeName)) {
      setNameError(NameError.AlreadyInUse);
      return;
    }
    const displayName = getNodeDisplayName(selectedItem);
    if (!nameError && displayName !== nodeName) {
      dispatch(
        setPropertyName({
          path: selectedItem.pointer,
          name: nodeName,
          navigate: true,
        }),
      );
    }
  };

  const t = (key: string) => getTranslation(key, language);
  const titleId = getDomFriendlyID(selectedNodePointer, 'title');
  const descriptionId = getDomFriendlyID(selectedNodePointer, 'description');
  const canToggleBetweenArrayAndField = useSelector((state: ISchemaState) =>
    canToggleArrayAndField(state.uiSchema, selectedNodePointer),
  );

  return (
    <div>
      {!selectedItem.isCombinationItem && (
        <>
          <Label htmlFor='selectedItemName'>{t('name')}</Label>
          <TextField
            aria-describedby='Selected Item Name'
            id='selectedItemName'
            onBlur={handleChangeNodeName}
            onChange={onNameChange}
            placeholder='Name'
            value={nodeName}
            aria-errormessage={t(nameError)}
            aria-placeholder='Name'
            autoFocus
          />
          {nameError && <ErrorMessage>{t(nameError)}</ErrorMessage>}
        </>
      )}
      {[ObjectKind.Array, ObjectKind.Field].includes(selectedItem.objectKind) &&
        itemsNode?.objectKind !== ObjectKind.Reference && (
          <Select
            id={getDomFriendlyID(selectedItem.pointer, 'type-select')}
            label={t('type')}
            onChange={(type) => {
              const selectedType = type as FieldType;
              selectedItem.objectKind === ObjectKind.Array
                ? onChangeFieldType(makePointer(selectedItem.pointer, Keywords.Items), selectedType)
                : onChangeFieldType(selectedItem.pointer, selectedType);
            }}
            options={getTypeOptions(t)}
            value={selectedItem.objectKind === ObjectKind.Array ? arrayType : fieldType}
          />
        )}
      {(selectedItem.objectKind === ObjectKind.Reference || itemsNode?.objectKind === ObjectKind.Reference) && (
        <ReferenceSelectionComponent
          buttonText={t('go_to_type')}
          classes={classes}
          label={t('reference_to')}
          onChangeRef={onChangeRef}
          onGoToDefButtonClick={onGoToDefButtonClick}
          selectedNode={itemsNode ?? selectedItem}
        />
      )}
      {selectedItem.objectKind !== ObjectKind.Combination && (
        <div className={classes.checkboxWrapper}>
          <Checkbox
            checked={selectedItem.fieldType === FieldType.Array}
            disabled={!canToggleBetweenArrayAndField}
            label={t('multiple_answers')}
            name='checkedMultipleAnswers'
            onChange={handleArrayPropertyToggle}
          />
        </div>
      )}
      {selectedItem.objectKind === ObjectKind.Combination && (
        <CombinationSelect
          id={getDomFriendlyID(selectedItem.pointer, 'combi-sel')}
          label={t('type')}
          onChange={onChangeCombinationType}
          options={getCombinationOptions(t)}
          value={selectedItem.fieldType}
        />
      )}
      {selectedItem.objectKind === ObjectKind.Combination && (
        <div className={classes.checkboxWrapper}>
          <Checkbox
            checked={combinationIsNullable(childNodes)}
            onChange={onChangeNullable}
            name='checkedNullable'
            checkboxId='multiple-answers-checkbox'
            label={t('nullable')}
          />
        </div>
      )}
      <ItemRestrictions selectedNode={selectedItem} language={language} itemsNode={itemsNode} />
      <Divider />
      <Fieldset legend={t('descriptive_fields')}>
        <Label htmlFor={titleId}>{t('title')}</Label>
        <TextField id={titleId} onBlur={onChangeTitle} onChange={(e) => setItemTitle(e.target.value)} value={title} />
        <Label htmlFor={descriptionId}>{t('description')}</Label>
        <MaterialTextField
          InputProps={{ disableUnderline: true }}
          className={classes.field}
          fullWidth
          id={descriptionId}
          margin='normal'
          multiline={true}
          onBlur={onChangeDescription}
          onChange={(e) => setItemDescription(e.target.value)}
          style={{ height: 100 }}
          value={description}
        />
      </Fieldset>
    </div>
  );
}
