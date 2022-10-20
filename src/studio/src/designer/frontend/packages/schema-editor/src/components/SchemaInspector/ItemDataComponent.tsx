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
import { getCombinationOptions, getTypeOptions } from './helpers/options';
import { Checkbox, ErrorMessage, FieldSet, TextField } from '@altinn/altinn-design-system';
import classes from './ItemDataComponent.module.css';
import { ItemRestrictions } from './ItemRestrictions';
import type { UiSchemaNode } from '@altinn/schema-model';
import {
  combinationIsNullable,
  CombinationKind,
  FieldType,
  getChildNodesByPointer,
  getNodeDisplayName,
  hasNodePointer,
  ObjectKind,
} from '@altinn/schema-model';
import { getDomFriendlyID, isValidName } from '../../utils/ui-schema-utils';
import { Divider } from '../common/Divider';
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

  const childNodes = useSelector((state: ISchemaState) => getChildNodesByPointer(state.uiSchema, selectedItem.pointer));

  useEffect(() => {
    setNodeName(getNodeDisplayName(selectedItem));
    setNameError(NameError.NoError);
    setItemTitle(selectedItem.title ?? '');
    setItemDescription(selectedItem.description ?? '');
  }, [selectedItem]);

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
      dispatch(addCombinationItem({ pointer: selectedItem.pointer, props: { fieldType: FieldType.Null } }));
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
    const ref = selectedItem.ref;
    if (ref !== undefined) {
      dispatch(navigateToType({ pointer: ref }));
    }
  };

  const onChangeCombinationType = (value: CombinationKind) =>
    dispatch(setCombinationType({ path: selectedItem.pointer, type: value }));

  const handleArrayPropertyToggle = () => dispatch(toggleArrayField({ pointer: selectedItem.pointer }));

  const uiSchema = useSelector((state: ISchemaState) => state.uiSchema);
  const handleChangeNodeName = () => {
    if (hasNodePointer(uiSchema, nodeName)) {
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

  return (
    <div className={classes.root}>
      {!selectedItem.isCombinationItem && (
        <div>
          <Label htmlFor='selectedItemName'>{t('name')}</Label>
          <TextField
            aria-describedby='Selected Item Name'
            aria-errormessage={t(nameError)}
            aria-placeholder='Name'
            autoFocus
            id='selectedItemName'
            onBlur={handleChangeNodeName}
            onChange={onNameChange}
            placeholder='Name'
            value={nodeName}
          />
          {nameError && <ErrorMessage>{t(nameError)}</ErrorMessage>}
        </div>
      )}
      {selectedItem.objectKind === ObjectKind.Field && (
        <Select
          id={getDomFriendlyID(selectedItem.pointer, 'type-select')}
          label={t('type')}
          onChange={(type) => onChangeFieldType(selectedItem.pointer, type as FieldType)}
          options={getTypeOptions(t)}
          value={fieldType}
        />
      )}
      {selectedItem.objectKind === ObjectKind.Reference && (
        <ReferenceSelectionComponent
          buttonText={t('go_to_type')}
          emptyOptionLabel={t('choose_type')}
          label={t('reference_to')}
          onChangeRef={onChangeRef}
          onGoToDefButtonClick={onGoToDefButtonClick}
          selectedNode={selectedItem}
        />
      )}
      {selectedItem.objectKind !== ObjectKind.Combination && (
        <Checkbox
          checked={selectedItem.isArray}
          label={t('multiple_answers')}
          name='checkedMultipleAnswers'
          onChange={handleArrayPropertyToggle}
        />
      )}
      {selectedItem.objectKind === ObjectKind.Combination && (
        <Select
          id={getDomFriendlyID(selectedItem.pointer, 'combi-sel')}
          label={t('type')}
          onChange={(combination) => onChangeCombinationType(combination as CombinationKind)}
          options={getCombinationOptions(t)}
          value={selectedItem.fieldType}
        />
      )}
      {selectedItem.objectKind === ObjectKind.Combination && (
        <Checkbox
          checkboxId='multiple-answers-checkbox'
          checked={combinationIsNullable(childNodes)}
          label={t('nullable')}
          name='checkedNullable'
          onChange={onChangeNullable}
        />
      )}
      <ItemRestrictions selectedNode={selectedItem} language={language} />
      <Divider inMenu />
      <FieldSet legend={t('descriptive_fields')} className={classes.fieldSet}>
        <div>
          <Label htmlFor={titleId}>{t('title')}</Label>
          <TextField id={titleId} onBlur={onChangeTitle} onChange={(e) => setItemTitle(e.target.value)} value={title} />
        </div>
        <div>
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
        </div>
      </FieldSet>
    </div>
  );
}
